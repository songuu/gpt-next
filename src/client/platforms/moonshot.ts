"use client";

import { getClientConfig } from "@/config/client";

import {
  REQUEST_TIMEOUT_MS,
  ApiPath,
  Moonshot,
  DEFAULT_API_HOST
} from "@/constant";

import {
  LLMApi,
  LLMModel,
  LLMConfig,
  getHeaders
} from "../api";

import {
  getMessageTextContent,
  isVisionModel,
} from "@/utils";

import { useAppConfig, useChatStore } from "@/store";

export const ROLES = ["system", "user", "assistant"] as const;

export type MessageRole = (typeof ROLES)[number];

export interface MultimodalContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
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

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;

  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export class MoonshotApi implements LLMApi {
  async chat(options: ChatOptions) {
    if (!useAppConfig) return
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
      messages,
      stream: options.config.stream,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      presence_penalty: modelConfig.presence_penalty,
      top_p: modelConfig.top_p,
    }

    let shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const path = this.path();

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

              const { finish_reason, delta = {} } = resultText?.choices[0];

              if (finish_reason !== 'stop' && delta?.content !== '') {
                remainText += delta?.content;
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
    } catch (err) { }
  }

  async usage() {
    return {} as any;
  }

  async models(): Promise<LLMModel[]> {
    return [];
  }

  path(): string {
    let baseUrl: string = "";

    if (baseUrl.trim().length === 0) {
      const isApp = !!getClientConfig()?.isApp;

      baseUrl = isApp
        ? DEFAULT_API_HOST + "/api/proxy/moonshot"
        : ApiPath.Moonshot;
    }

    if (!baseUrl.startsWith("http") && !baseUrl.startsWith("/api")) {
      baseUrl = "https://" + baseUrl;
    }

    baseUrl = trimEnd(baseUrl, "/");

    return `${baseUrl}/${Moonshot.ChatPath}`;
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

function trimEnd(s: string, end = " ") {
  if (end.length === 0) return s;

  while (s.endsWith(end)) {
    s = s.slice(0, -end.length);
  }

  return s;
}