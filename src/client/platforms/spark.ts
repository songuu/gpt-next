"use client";
import CryptoJS from 'crypto-js'
import {
  SparkApiPath,
  SPARK_BASE_URL
} from "@/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/store";
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
  LLMUsage,
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


export class SparkApi implements LLMApi {
  #socket: any = null;

  constructor() {
    console.log("init spark api", this.#socket)
    if (!this.#socket) {
      this.#connect();
    }
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    console.log("options", options)
    if (!this.#socket) return options.onError?.(new Error("reconnected please try again"));
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

    const accessStore = useAccessStore.getState();

    const requestPayload: any = {
      header: {
        app_id: accessStore.sparkAppId
      },
      parameter: {
        chat: {
          domain: "",
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens
        }
      },
      payload: {
        text: messages,
      }
    }
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
    const accessStore = useAccessStore.getState();

    let baseUrl: string = SPARK_BASE_URL;
    let subPath: string = SparkApiPath[model];

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.qwenUrl;
    }
    const path = `${baseUrl}${subPath}`;

    return new Promise((resolve, reject) => {
      const apiKey = accessStore.sparkApiKey;
      const apiSecret = accessStore.sparkSecret;


      let url = 'wss://' + path

      const host = location.host
      const date = new Date().toString()
      const algorithm = 'hmac-sha256'
      const headers = 'host date request-line'
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${subPath} HTTP/1.1`
      const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
      const signature = CryptoJS.enc.Base64.stringify(signatureSha)
      const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
      const authorization = btoa(authorizationOrigin)
      url = `${url}?authorization=${authorization}&date=${date}&host=${host}`
      resolve(url)
    })
  }

  async #onmessage() { }

  async #connect() {
    // soccket 逻辑处理
    console.log("connect spark api")
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig
    }

    const url = await this.path(modelConfig.model);
    if ('WebSocket' in window) {
      this.#socket = new WebSocket(url)
    } else if ('MozWebSocket' in window) {
      // @ts-ignore
      this.#socket = new MozWebSocket(url)
    } else {
      alert('浏览器不支持WebSocket')
      return
    }

    const recentMessages = useChatStore.getState().getMessagesWithMemory();

    this.chat({
      messages: recentMessages,
      config: { ...modelConfig, stream: true },
    })
  }
}