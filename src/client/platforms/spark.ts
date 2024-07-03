"use client";
import CryptoJS from 'crypto-js';
import {
  SparkApiPath,
  SPARK_BASE_URL,
  ApiPath,
  DEFAULT_API_HOST,
} from "@/constant";
import { useAppConfig, useChatStore } from "@/store";
import {
  getMessageTextContent,
  isVisionModel,
} from "@/utils";
import { getClientConfig } from "@/config/client";

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export interface MultimodalContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

import {
  LLMApi,
  getHeaders
} from "../api";

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;

  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

class SparkApi implements LLMApi {
  private static instance: SparkApi;
  private socket: WebSocket | null = null;
  private configs: any = null;
  private options: ChatOptions | null = null;
  private responseText: string = "";
  private remainText: string = "";
  private finished: boolean = false;
  private messageQueue: string[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // in ms

  private constructor() {
    this.connect();
  }

  public static getInstance(): SparkApi {
    if (!SparkApi.instance) {
      SparkApi.instance = new SparkApi();
    }
    return SparkApi.instance;
  }

  private resetData() {
    this.finished = false;
    this.remainText = '';
    this.responseText = '';
  }

  private async fetchConfig() {
    const baseUrl = getClientConfig()?.isApp ? `${DEFAULT_API_HOST}/api/proxy/spark` : ApiPath.Spark;
    const response = await fetch(`${baseUrl}/config`, {
      method: "GET",
      // headers: getHeaders(),
    });
    return response.json();
  }

  private async generateSocketUrl(model: string): Promise<string> {
    const baseUrl: string = SPARK_BASE_URL;
    const subPath: string = SparkApiPath[model];
    const path = `${baseUrl}${subPath}`;
    const host = location.host;
    const date = new Date().toGMTString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${subPath} HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.configs.sparkSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${this.configs.sparkApiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `wss://${path}?authorization=${authorization}&date=${date}&host=${host}`;
  }

  private async connect() {
    try {
      this.resetData();
      const modelConfig = {
        ...useAppConfig.getState().modelConfig,
        ...useChatStore.getState().currentSession().mask.modelConfig,
      };
      if (!modelConfig.model.startsWith('ERNIE-')) return

      this.configs = await this.fetchConfig();

      const url = await this.generateSocketUrl(modelConfig.model);

      this.socket = 'WebSocket' in window ? new WebSocket(url) : 'MozWebSocket' in window ? new MozWebSocket(url) : null;
      if (!this.socket) {
        alert('Browser does not support WebSocket');
        return;
      }

      this.socket.onerror = (e) => {
        console.error("WebSocket error:", e);
        this.handleSocketError();
      };

      this.socket.onopen = () => {
        console.log("WebSocket open");
        this.reconnectAttempts = 0;
        // const recentMessages = useChatStore.getState().getMessagesWithMemory();
        // this.chat({
        //   messages: recentMessages,
        //   config: { ...modelConfig, stream: true },
        // });
        this.animateResponseText();
        this.processMessageQueue();  // 处理消息队列
      };

      this.socket.onclose = () => {
        console.log("WebSocket close");
        this.resetData();
        this.handleSocketError();
      };

      this.socket.onmessage = (e: any) => this.onMessage(e);
    } catch (err) {
    }
  }

  private handleSocketError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay);
    } else {
      this.options?.onError?.(new Error("Unable to reconnect to WebSocket after multiple attempts"));
    }
  }

  private async onMessage(e: any) {
    try {
      const jsonData = JSON.parse(e.data);
      if (jsonData.header.code === 0) {
        const msg = this.getContent(jsonData);
        if (jsonData.header.status === 2) {
          this.finished = true;
          this.socket?.close();
          this.options?.onFinish?.(this.remainText + msg || 'error');
        } else {
          this.remainText += msg;
        }
      } else {
        throw new Error(`${jsonData.header.code}:${jsonData.header.message}`);
      }
    } catch (err) {
      console.error("Handle message exception:", err);
      this.options?.onError?.(err);
    }
  }

  private getContent(jsonData: any): string {
    let content = "";
    if (jsonData.header.code === 0) {
      for (const choice of jsonData.payload.choices.text) {
        content += choice.content;
      }
    }
    return content;
  }

  private animateResponseText() {
    if (this.finished) {
      this.responseText += this.remainText;
      this.finish();
      return;
    }

    if (this.remainText.length > 0) {
      const fetchCount = Math.max(1, Math.round(this.remainText.length / 60));
      const fetchText = this.remainText.slice(0, fetchCount);
      this.responseText += fetchText;
      this.remainText = this.remainText.slice(fetchCount);
      this.options?.onUpdate?.(this.responseText, fetchText);
    }

    window.requestAnimationFrame(this.animateResponseText.bind(this));
  }

  private finish() {
    if (!this.finished) {
      this.finished = true;
      this.options?.onFinish?.(this.responseText + this.remainText);
    }
  }

  public async chat(options: ChatOptions) {
    this.options = options;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.queueMessage(options);
      await this.connect();
    } else {
      this.sendMessage(options);
    }
  }

  private queueMessage(options: ChatOptions) {
    const visionModel = isVisionModel(options.config.model);
    const messages = options.messages.map((v) => ({
      role: v.role,
      content: visionModel ? v.content : getMessageTextContent(v),
    }));
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      model: options.config.model,
    };
    const requestPayload = {
      header: {
        app_id: this.configs.sparkAppId,
        uid: "fd3f47e40d",
      },
      parameter: {
        chat: {
          domain: modelConfig.model,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens,
        },
      },
      payload: {
        message: { text: messages },
      },
    };
    this.messageQueue.push(JSON.stringify(requestPayload));
  }

  private processMessageQueue() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.socket.send(message);
        }
      }
    }
  }

  private sendMessage(options: ChatOptions) {
    const visionModel = isVisionModel(options.config.model);
    const messages = options.messages.map((v) => ({
      role: v.role,
      content: visionModel ? v.content : getMessageTextContent(v),
    }));
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      model: options.config.model,
    };
    const requestPayload = {
      header: {
        app_id: this.configs.sparkAppId,
        uid: "fd3f47e40d",
      },
      parameter: {
        chat: {
          domain: modelConfig.model,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens,
        },
      },
      payload: {
        message: { text: messages },
      },
    };
    this.socket?.send(JSON.stringify(requestPayload));
  }
}

// Ensure singleton instance
const SparkApiIns = SparkApi.getInstance();

export {
  SparkApiIns
}
