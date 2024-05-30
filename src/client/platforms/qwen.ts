"use client";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source"
import {
  ApiPath,
  DEFAULT_API_HOST,
  REQUEST_TIMEOUT_MS,
  Qwen,
} from "@/constant";
import { ModelType, useAccessStore, useAppConfig, useChatStore } from "@/store";
import {
  getMessageTextContent,
  isVisionModel,
} from "@/utils";
import { prettyObject } from "@/utils/format";
import { getClientConfig } from "@/config/client";
import Locale from "@/locales";

export const ROLES = ["system", "user", "assistant"] as const;

export type MessageRole = (typeof ROLES)[number];

export function isMultiModal(model: string): boolean {
  return model.startsWith('qwen-vl');
}

export function getCompletionCreateEndpoint(model: string) {
  return isMultiModal(model)
    ? '/services/aigc/multimodal-generation/generation'
    : '/services/aigc/text-generation/generation';
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
  input: {
    messages: {
      role: "system" | "user" | "assistant";
      content: string | MultimodalContent[];
    }[];
  }
}

import {
  LLMApi,
  LLMModel,
  LLMUsage,
  getHeaders
} from "../api";

function trimEnd(s: string, end = " ") {
  if (end.length === 0) return s;

  while (s.endsWith(end)) {
    s = s.slice(0, -end.length);
  }

  return s;
}

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

export class QwenApi implements LLMApi {
  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    const visionModel = isVisionModel(options.config.model);

    const messages = options.messages.map((v) => ({
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
      input: { messages },
      stream: options.config.stream,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      presence_penalty: modelConfig.presence_penalty,
      top_p: modelConfig.top_p,
      __binaryResponse: true,
      parameters: {
        incremental_output: true,
      },
    };

    const accessStore = useAccessStore.getState();

    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.qwenUrl;
    }

    const isApp = !!getClientConfig()?.isApp;

    let shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const path = this.path(modelConfig.model);

      if (isApp) {
        baseUrl += `?key=${accessStore.qwenApiKey}`;
      }

      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;

        let existingTexts: string[] = [];

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

        console.log("[path=====>] ", path, chatPayload)

        fetch(path, chatPayload).then((response) => {
          const reader = response?.body?.getReader();
          const decoder = new TextDecoder();
          let partialData = "";

          return reader?.read().then(function processText({
            done,
            value,
          }): Promise<any> {
            if (done) {
              console.log("JSON.parse(partialData)", response)
              if (response.status !== 200) {
                try {
                  let data = JSON.parse(partialData);
                  if (data && data[0].error) {
                    options.onError?.(new Error(data[0].error.message));
                  } else {
                    options.onError?.(new Error("Request failed"));
                  }
                } catch (_) {
                  options.onError?.(new Error("Request failed"));
                }
              }

              console.log("Stream complete");
              // options.onFinish(responseText + remainText);
              finished = true;
              return Promise.resolve();
            }

            partialData += decoder.decode(value, { stream: true });

            try {
              const resultText = getResult(partialData);
              console.log("qwen data", resultText);

              // const textArray = data.reduce(
              //   (acc: string[], item: { candidates: any[] }) => {
              //     const texts = item.candidates.map((candidate) =>
              //       candidate.content.parts
              //         .map((part: { text: any }) => part.text)
              //         .join(""),
              //     );
              //     return acc.concat(texts);
              //   },
              //   [],
              // );

              // if (resultText.length > existingTexts.length) {
              //   const deltaArray = textArray.slice(existingTexts.length);
              //   existingTexts = textArray;
              //   remainText += deltaArray.join("");
              // }
            } catch (error) {
              console.log("[Response Animation] error: ", error, partialData);
              // skip error message when parsing json
            }

            return reader.read().then(processText);
          })
        }).catch((error) => {
          console.error("Error:", error);
        });

        // fetchEventSource(path, {
        //   ...chatPayload,
        //   openWhenHidden: true,
        //   async onopen(res) {
        //     clearTimeout(requestTimeoutId);
        //     const contentType = res.headers.get("content-type");
        //     console.log(
        //       "[Qwen] request response content type: ",
        //       res,
        //     );

        //     if (contentType?.startsWith("text/plain")) {
        //       responseText = await res.clone().text();
        //       return finish();
        //     }

        //     console.log("[Qwen] response", res)

        //     if (
        //       !res.ok ||
        //       !res.headers
        //         .get("content-type")
        //         ?.startsWith(EventStreamContentType) ||
        //       res.status !== 200
        //     ) {
        //       const responseTexts = [responseText];
        //       let extraInfo = await res.clone().text();
        //       try {
        //         const resJson = await res.clone().json();
        //         extraInfo = prettyObject(resJson);
        //       } catch { }

        //       if (res.status === 401) {
        //         responseTexts.push(Locale.Error.Unauthorized);
        //       }

        //       if (extraInfo) {
        //         responseTexts.push(extraInfo);
        //       }

        //       responseText = responseTexts.join("\n\n");

        //       return finish();
        //     }
        //   },
        //   onmessage(msg) {
        //     if (msg.data === "[DONE]" || finished) {
        //       return finish();
        //     }
        //     const text = msg.data;
        //     try {
        //       const json = JSON.parse(text);
        //       const choices = json.choices as Array<{
        //         delta: { content: string };
        //       }>;
        //       const delta = choices[0]?.delta?.content;
        //       const textmoderation = json?.prompt_filter_results;

        //       if (delta) {
        //         remainText += delta;
        //       }

        //       // if (
        //       //   textmoderation &&
        //       //   textmoderation.length > 0 &&
        //       //   ServiceProvider.Azure
        //       // ) {
        //       //   const contentFilterResults =
        //       //     textmoderation[0]?.content_filter_results;
        //       //   console.log(
        //       //     `[${ServiceProvider.Azure}] [Text Moderation] flagged categories result:`,
        //       //     contentFilterResults,
        //       //   );
        //       // }
        //     } catch (e) {
        //       console.error("[Request] parse error", text, msg);
        //     }
        //   },
        //   onclose() {
        //     finish();
        //   },
        //   onerror(e) {
        //     options.onError?.(e);
        //     throw e;
        //   },
        // })
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
        ? DEFAULT_API_HOST + "/api/proxy/qwen"
        : ApiPath.Qwen;
    }

    if (!baseUrl.startsWith("http") && !baseUrl.startsWith("/api")) {
      baseUrl = "https://" + baseUrl;
    }

    baseUrl = trimEnd(baseUrl, "/");

    const path = getCompletionCreateEndpoint(model)

    return `${baseUrl}${path}`;
  }
}

function ensureProperEnding(str: string) {
  if (str.startsWith("[") && !str.endsWith("]")) {
    return str + "]";
  }
  return str;
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