"use client";
import CryptoJS, { mode } from 'crypto-js'
import {
  SparkApiPath,
  SPARK_BASE_URL,
  ApiPath,
  DEFAULT_API_HOST,
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
  #config: any = null;

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
    console.log("this.#config", this.#config)
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

    const requestPayload: any = {
      header: {
        app_id: this.#config.sparkAppId,
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

    this.#socket.send(JSON.stringify(requestPayload))
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
    console.log("config", this.#config, model)
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
      const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.#config.sparkSecret)
      const signature = CryptoJS.enc.Base64.stringify(signatureSha)
      const authorizationOrigin = `api_key="${this.#config.sparkApiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
      const authorization = btoa(authorizationOrigin)
      url = `${url}?authorization=${authorization}&date=${date}&host=${host}`
      resolve(url)
    })
  }

  async #onmessage() { }

  async #connect() {
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
      this.#config = resJson;
    }
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig
    }

    const url = await this.path(modelConfig.model);
    // wss://spark-api.xf-yun.comundefined?authorization=YXBpX2tleT0iMTFlNmQ0MWM1Y2IxN2Q0ODQxZDkzY2MzYzM5NDQ4OTEiLCBhbGdvcml0aG09ImhtYWMtc2hhMjU2IiwgaGVhZGVycz0iaG9zdCBkYXRlIHJlcXVlc3QtbGluZSIsIHNpZ25hdHVyZT0iNUJwVmNuZm5nWkxzV0R1WVhPU1NJaGliOG5BKzJqYTNSa0kxTlpkS2kwdz0i&date=Thu, 13 Jun 2024 09:18:06 GMT&host=localhost:3000
    console.log("url", url)
    if ('WebSocket' in window) {
      this.#socket = new WebSocket(url)
    } else if ('MozWebSocket' in window) {
      // @ts-ignore
      this.#socket = new MozWebSocket(url)
    } else {
      alert('浏览器不支持WebSocket')
      return
    }

    this.#socket.onerror = (e) => {
      console.error("WebSocket error:", e);
    }

    this.#socket.onopen = () => {
      console.log("WebSocket open");
      // 连接成功就发送历史消息
      const recentMessages = useChatStore.getState().getMessagesWithMemory();

      this.chat({
        messages: recentMessages,
        config: { ...modelConfig, stream: true },
      })
    };
    this.#socket.onclose = () => {
      console.log("WebSocket close");
    };
    this.#socket.onmessage = (e) => {
      console.log("onmessage", e)
    }
  }
}