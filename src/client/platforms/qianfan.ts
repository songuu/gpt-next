"use client";
import {
  QIANFAN_BASE_URL,
  ApiPath,
  DEFAULT_API_HOST,
  REQUEST_TIMEOUT_MS,
  qianfanModelsPaths
} from "@/constant";
import { useAppConfig, useChatStore, useAccessStore } from "@/store";
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

interface RequestPayload {
  stream?: boolean;
  model: string;
  temperature: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p: number;
  max_tokens?: number;
  __binaryResponse?: boolean;
  parameters?: any;
  messages: {
    role: "system" | "user" | "assistant";
    content: string | MultimodalContent[];
  }[];
}

function trimEnd(s: string, end = " ") {
  if (end.length === 0) return s;

  while (s.endsWith(end)) {
    s = s.slice(0, -end.length);
  }

  return s;
}

export function getCompletionCreateEndpoint(model: string) {
  return ""
}

export class QianfanApi implements LLMApi {
  async chat(options: ChatOptions) {
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
    const requestPayload: RequestPayload = {
      messages: messages,
      stream: options.config.stream,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p
    }

    let shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const path = this.path(modelConfig.model);
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;

        // animate response to make it looks smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            finish();
            return;
          }

          if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            const fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
            options.onUpdate?.(responseText, fetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // start animaion
        animateResponseText();

        const finish = () => {
          if (!finished) {
            finished = true;
            options.onFinish(responseText + remainText);
          }
        };

        controller.signal.onabort = finish;

        fetch(path, chatPayload).then((response) => {
          const reader = response?.body?.getReader();
          const decoder = new TextDecoder();

          return reader?.read().then(function processText({
            done,
            value,
          }): Promise<any> {
            if (done) {
              if (response.status !== 200) {
                try {
                  options.onError?.(new Error("Request failed"));
                } catch (_) {
                  options.onError?.(new Error("Request failed"));
                }
              }

              options.onFinish(responseText + remainText);
              finished = true;
              return Promise.resolve();
            }

            try {
              const tt = decoder.decode(value, { stream: true });

              const resultText = getResult(tt);

              if (resultText?.is_end) {
                options.onFinish(remainText + resultText?.result || 'error');
                finished = true;
                return Promise.resolve();
              }

              const { result } = resultText || {};

              if (result) {
                remainText += result
              }
            } catch (error) {
              console.log("[Response Animation] error: ", error);
            }

            return reader.read().then(processText);
          })
        }).catch((error) => { });
      } else {
        const res = await fetch(path, chatPayload);
        clearTimeout(requestTimeoutId);

        const resJson = await res.json();
        const message = this.extractMessage(resJson);
        options.onFinish(message);
      }
    } catch (error) { }
  }

  async usage() {
    return {} as any;
  }

  async models(): Promise<LLMModel[]> {
    return [];
  }

  path(model: string): string {
    const accessStore = useAccessStore.getState();

    let baseUrl: string = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.qwenUrl;
    }

    // if endpoint is empty, use default endpoint
    if (baseUrl.trim().length === 0) {
      const isApp = !!getClientConfig()?.isApp;

      baseUrl = isApp
        ? DEFAULT_API_HOST + "/api/proxy/qianfan"
        : ApiPath.Qianfan;
    }

    if (!baseUrl.startsWith("http") && !baseUrl.startsWith("/api")) {
      baseUrl = "https://" + baseUrl;
    }

    baseUrl = trimEnd(baseUrl, "/");

    const path = qianfanModelsPaths[model] ?? "";

    return `${baseUrl}${path}`;
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }
}

function getResult(resultText: string) {
  const lines = resultText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const data = JSON.parse(line.slice(5));
      return data;
    }
  }
}