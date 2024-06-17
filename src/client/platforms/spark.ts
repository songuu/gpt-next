"use client";
import CryptoJS from 'crypto-js'
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
  LLMModel,
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

let socket: any = null;
let configs: any = null;

export class SparkApi implements LLMApi {
  // private socket: any = null;
  // private config: any = null;
  private options: any = null;

  private responseText: string = "";
  private remainText: string = "";
  private finished: boolean = false;

  //  初始化需要传递，因为第一次链接上socket时，需要传递
  constructor() {
    console.log("init spark api", socket)
    if (!socket) {
      this.connect();
    }
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    this.options = options;
    if (!socket) {
      // return options.onError?.(new Error("reconnected please try again"));
      this.connect();
      return;
    }
    const visionModel = isVisionModel(options.config.model);

    const messages = options.messages.map((v: any) => ({
      role: v.role,
      content: visionModel ? v.content : getMessageTextContent(v),
    }));
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };

    const requestPayload: any = {
      header: {
        app_id: configs.sparkAppId,
        uid: "fd3f47e40d",
      },
      parameter: {
        chat: {
          domain: modelConfig.model,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens
        }
      },
      payload: {
        message: { text: messages }
      }
    }

    this.handleSend(JSON.stringify(requestPayload))
    try {
    } catch (err) { }
  }

  async usage() {
    return {} as any;
  }

  async models(): Promise<LLMModel[]> {
    return [];
  }

  async path(model: string): Promise<any> {
    console.log("config", configs, model)
    const baseUrl: string = SPARK_BASE_URL;
    let subPath: string = SparkApiPath[model];
    const path = `${baseUrl}${subPath}`;


    return new Promise(async (resolve, reject) => {
      let url = 'wss://' + path

      const host = location.host;
      const date = new Date().toGMTString()
      const algorithm = 'hmac-sha256'
      const headers = 'host date request-line'
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${subPath} HTTP/1.1`
      const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, configs.sparkSecret)
      const signature = CryptoJS.enc.Base64.stringify(signatureSha)
      const authorizationOrigin = `api_key="${configs.sparkApiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
      const authorization = btoa(authorizationOrigin)
      url = `${url}?authorization=${authorization}&date=${date}&host=${host}`
      resolve(url)
    })
  }

  async onmessage(e: any) {
    try {
      const resultData = e.data;
      const jsonData = JSON.parse(resultData);
      if (jsonData.header.code === 0) {
        const msg = this.getContent(jsonData);
        console.log("Got message", msg);
        if (jsonData.header.status === 2) {
          console.log("API response finished");
          this.finished = true;
          socket.close();
          if (this.options && this.options?.onFinish) {
            this.options?.onFinish(this.remainText + msg || 'error');
          }
          return Promise.resolve();
        }

        this.remainText += msg;
      } else {
        const error = new Error(
          `${jsonData.header.code}:${jsonData.header.message}`,
        );
        console.error("API error:", error);
        Promise.reject(error);
      }
    } catch (e) {
      console.error("Handle message exception:", e);
      Promise.reject(e);
    }
  }

  async connect() {
    this.resetData();
    // soccket 逻辑处理
    console.log("connect spark api")
    let baseUrl: string = "";

    const isApp = !!getClientConfig()?.isApp;

    baseUrl = isApp
      ? DEFAULT_API_HOST + "/api/proxy/spark"
      : ApiPath.Spark;


    const chatPayload = {
      method: "GET",
      headers: getHeaders(),
    };

    // 首先获取配置文件
    const res = await fetch(baseUrl + '/config', chatPayload);

    const resJson = await res.json();

    if (resJson) {
      configs = resJson;
    }
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig
    }

    const url = await this.path(modelConfig.model);
    console.log("url", url)
    if ('WebSocket' in window) {
      socket = new WebSocket(url)
    } else if ('MozWebSocket' in window) {
      // @ts-ignore
      socket = new MozWebSocket(url)
    } else {
      alert('浏览器不支持WebSocket')
      return
    }

    socket.onerror = (e) => {
      console.error("WebSocket error:", e);
    }

    socket.onopen = () => {
      console.log("WebSocket open");
      // 连接成功就发送历史消息
      const recentMessages = useChatStore.getState().getMessagesWithMemory();

      this.chat({
        messages: recentMessages,
        config: { ...modelConfig, stream: true },
      })

      this.animateResponseText();
    };
    socket.onclose = () => {
      console.log("WebSocket close");
      this.resetData();
    };
    socket.onmessage = (e: any) => {
      // console.log("onmessage", e)
      this.onmessage(e)
    }
  }

  getContent(jsonData: any) {
    let content = "";
    try {
      if (jsonData.header.code === 0) {
        for (const choice of jsonData.payload.choices.text) {
          content += choice.content;
        }
      }
    } catch (e) {
      console.error("Get content error:", e);
    }
    return content;
  }

  resetData() {
    this.finished = false;
    this.remainText = '';
    this.responseText = '';
  }

  // 提供给外部的结束socket连接
  closeSocket() {
    if (socket) {
      socket.close()
    }
  }

  animateResponseText() {
    // console.log("this?.remainText", this?.remainText, this?.finished)
    if (this?.finished) {
      this.responseText += this.remainText;
      this.finish();
      return;
    }

    if (this?.remainText.length > 0) {
      const fetchCount = Math.max(1, Math.round(this.remainText.length / 60));
      const fetchText = this.remainText.slice(0, fetchCount);
      this.responseText += fetchText;
      this.remainText = this.remainText.slice(fetchCount);
      if (this.options) {
        this.options.onUpdate?.(this.responseText, fetchText);
      }
    }

    window.requestAnimationFrame(this?.animateResponseText.bind(this));
  }

  finish() {
    if (!this.finished) {
      this.finished = true;
      this.options.onFinish(this.responseText + this.remainText);
    }
  };

  async handleSend(message: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    } else {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待一段时间以确保连接打开
        socket.send(message);
      } catch (err) {
        console.error("Failed to send message due to connection issue", err);
      }
    }
  };
}