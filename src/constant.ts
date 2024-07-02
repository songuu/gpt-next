export const OWNER = "songuu";
export const REPO = "gpt-next";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const ISSUE_URL = `https://github.com/${OWNER}/${REPO}/issues`;
export const UPDATE_URL = `${REPO_URL}#keep-updated`;
export const RELEASE_URL = `${REPO_URL}/releases`;
export const FETCH_COMMIT_URL = `https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=1`;
export const FETCH_TAG_URL = `https://api.github.com/repos/${OWNER}/${REPO}/tags?per_page=1`;
export const RUNTIME_CONFIG_DOM = "danger-runtime-config";

export const DEFAULT_API_HOST = "https://api.nextchat.dev";
export const OPENAI_BASE_URL = "https://api.openai.com";
export const ANTHROPIC_BASE_URL = "https://api.anthropic.com";

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/";

export const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/"

export const SPARK_BASE_URL = "spark-api.xf-yun.com";

export const QIANFAN_BASE_URL = 'https://aip.baidubce.com'

export const MOONSHOT_BASE_URL = "https://api.moonshot.cn"

export enum Path {
  Home = "/",
  Chat = "/chat",
  Settings = "/settings",
  NewChat = "/new-chat",
  Masks = "/masks",
  // 主要是用来填写自定义openai的key
  Auth = "/auth",
  Login = '/login',
  Logout = '/logout'
}

export const SparkApiPath: Record<string, string> = {
  general: '/v1.1/chat',
  generalv2: '/v2.1/chat',
  generalv3: '/v3.1/chat',
  'generalv3.5': '/v3.5/chat',
}

export enum ApiPath {
  Cors = "",
  OpenAI = "/api/openai",
  Anthropic = "/api/anthropic",
  Qwen = '/api/qwen',
  Spark = '/api/spark',
  Qianfan = '/api/qianfan',
  Moonshot = '/api/moonshot'
}

export enum SlotID {
  AppBody = "app-body",
  CustomModel = "custom-model",
}

export enum FileName {
  Masks = "masks.json",
  Prompts = "prompts.json",
}

export enum StoreKey {
  Chat = "chat-next-web-store",
  Access = "access-control",
  Config = "app-config",
  Mask = "mask-store",
  Prompt = "prompt-store",
  Update = "chat-update",
  Sync = "sync",
}

export const DEFAULT_SIDEBAR_WIDTH = 300;
export const MAX_SIDEBAR_WIDTH = 500;
export const MIN_SIDEBAR_WIDTH = 230;
export const NARROW_SIDEBAR_WIDTH = 100;

export const ACCESS_CODE_PREFIX = "nk-";

export const LAST_INPUT_KEY = "last-input";
export const UNFINISHED_INPUT = (id: string) => "unfinished-input-" + id;

export const STORAGE_KEY = "gpt-next";

export const REQUEST_TIMEOUT_MS = 60000;

export const EXPORT_MESSAGE_CLASS_NAME = "export-markdown";

export enum ServiceProvider {
  OpenAI = "OpenAI",
  Azure = "Azure",
  Google = "Google",
  Anthropic = "Anthropic",
  Qwen = "Qwen",
  Spark = "Spark",
  Qianfan = "Qianfan",
  Moonshot = "Moonshot"
}

export enum ModelProvider {
  GPT = "GPT",
  GeminiPro = "GeminiPro",
  Claude = "Claude",
  Qwen = "Qwen",
  Spark = "Spark",
  Qianfan = "Qianfan",
  Moonshot = "Moonshot"
}

export const Anthropic = {
  ChatPath: "v1/messages",
  ChatPath1: "v1/complete",
  ExampleEndpoint: "https://api.anthropic.com",
  Vision: "2023-06-01",
};

export const OpenaiPath = {
  ChatPath: "v1/chat/completions",
  UsagePath: "dashboard/billing/usage",
  SubsPath: "dashboard/billing/subscription",
  ListModelPath: "v1/models",
};

export const Azure = {
  ExampleEndpoint: "https://{resource-url}/openai/deployments/{deploy-id}",
};

export const Google = {
  ExampleEndpoint: "https://generativelanguage.googleapis.com/",
  ChatPath: (modelName: string) => `v1beta/models/${modelName}:generateContent`,
};

export const Qwen = {
  ExampleEndpoint: "https://dashscope.aliyuncs.com/api/",
  ChatPath: ''
}

export const Spark = {
  ExampleEndpoint: "wss://spark-api.xf-yun.com",
  ChatPath: ''
}

export const Moonshot = {
  ExampleEndpoint: '',
  ChatPath: 'v1/chat/completions'
}

export const DEFAULT_INPUT_TEMPLATE = `{{input}}`; // input / time / model / lang
// export const DEFAULT_SYSTEM_TEMPLATE = `
// You are ChatGPT, a large language model trained by {{ServiceProvider}}.
// Knowledge cutoff: {{cutoff}}
// Current model: {{model}}
// Current time: {{time}}
// Latex inline: $x^2$
// Latex block: $$e=mc^2$$
// `;
export const DEFAULT_SYSTEM_TEMPLATE = `
You are ChatGPT, a large language model trained by {{ServiceProvider}}.
Knowledge cutoff: {{cutoff}}
Current model: {{model}}
Current time: {{time}}
Latex inline: \\(x^2\\) 
Latex block: $$e=mc^2$$
`;

export const SUMMARIZE_MODEL = "gpt-3.5-turbo";
// export const GEMINI_SUMMARIZE_MODEL = "gemini-pro";

export const KnowledgeCutOffDate: Record<string, string> = {
  default: "2021-09",
  "gpt-4-turbo": "2023-12",
  "gpt-4-turbo-2024-04-09": "2023-12",
  "gpt-4-turbo-preview": "2023-12",
  "gpt-4-vision-preview": "2023-04",
  // "gemini-pro": "2023-12",
  // "gemini-pro-vision": "2023-12",
};

const openaiModels = [
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-4",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0613",
  "gpt-4-turbo",
  "gpt-4-turbo-preview",
  "gpt-4-vision-preview",
  "gpt-4-turbo-2024-04-09",
  "gpt-4o"
];

const googleModels = [
  "gemini-1.0-pro",
  "gemini-1.5-pro-latest",
  "gemini-pro-vision",
];

const anthropicModels = [
  "claude-instant-1.2",
  "claude-2.0",
  "claude-2.1",
  "claude-3-sonnet-20240229",
  "claude-3-opus-20240229",
  "claude-3-haiku-20240307",
];

export const qwenModels1 = [
  // 通义千问
  'qwen-long',
  // 长文本，多轮
  'qwen-turbo',
  'qwen-plus',
  'qwen-max',
  'qwen-max-0428',
  'qwen-max-0403',
  'qwen-max-0107',
  'qwen-max-1201',
  'qwen-max-longcontext',
  // 通义千问开源系列
  'qwen-7b-chat',
  'qwen-14b-chat',
  'qwen-72b-chat',
]

export const qwenModels2 = [
  'qwen2-72b-instruct',
  // 通义千问图文
  'qwen-vl-v1',
  'qwen-vl-chat-v1',
  // 通义千问图文 兼容openai
  'qwen-vl-plus',
  'qwen-vl-max'
]

export const disabledImgModels = [
  ...qwenModels1,
  'qwen2-72b-instruct',
  'qwen-vl-v1',
  'qwen-vl-chat-v1'
]

export const qwenModels = [
  ...qwenModels1,
  ...qwenModels2
]

export const sparkModels = [
  'general',
  'generalv2',
  'generalv3',
  'generalv3.5'
]

export const qianfanModels = [
  'ERNIE-4.0-8K',
  'ERNIE-4.0-8K-0613',
  'ERNIE-3.5-8K',
  'ERNIE-3.5-128K'
]

export const qianfanModelsPaths: Record<string, string> = {
  'ERNIE-4.0-8K': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro',
  'ERNIE-4.0-8K-0613': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-4.0-8k-0613',
  'ERNIE-3.5-8K': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
  'ERNIE-3.5-128K': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-3.5-128k'
}

export const moonshotModels = [
  'moonshot-v1-8k',
  'moonshot-v1-32k',
  'moonshot-v1-128k'
]

export const DEFAULT_MODELS = [
  ...openaiModels.map((name) => ({
    name,
    available: true,
    provider: {
      id: "openai",
      providerName: "OpenAI",
      providerType: "openai",
    },
  })),
  ...googleModels.map((name) => ({
    name,
    available: true,
    provider: {
      id: "google",
      providerName: "Google",
      providerType: "google",
    },
  })),
  ...anthropicModels.map((name) => ({
    name,
    available: true,
    provider: {
      id: "anthropic",
      providerName: "Anthropic",
      providerType: "anthropic",
    },
  })),
  ...qwenModels.map((name) => ({
    name,
    available: true,
    provider: {
      id: "qwen",
      providerName: "Qwen",
      providerType: "qwen"
    }
  })),
  ...sparkModels.map((name) => ({
    name,
    available: true,
    provider: {
      id: "spark",
      providerName: "Spark",
      providerType: "spark"
    }
  })),
  ...qianfanModels.map(name => ({
    name,
    available: true,
    provider: {
      id: "qianfan",
      providerName: "Qianfan",
      providerType: "qianfan"
    }
  })),
  ...moonshotModels.map(name => ({
    name,
    available: true,
    provider: {
      id: 'moonshot',
      providerName: "Moonshot",
      providerType: "moonshot"
    }
  }))
] as const;

export const CHAT_PAGE_SIZE = 15;
export const MAX_RENDER_MSG_COUNT = 45;

// some famous webdav endpoints
export const internalAllowedWebDavEndpoints = [
  "https://dav.jianguoyun.com/dav/",
  "https://dav.dropdav.com/",
  "https://dav.box.com/dav",
  "https://nanao.teracloud.jp/dav/",
  "https://webdav.4shared.com/",
  "https://dav.idrivesync.com",
  "https://webdav.yandex.com",
  "https://app.koofr.net/dav/Koofr",
];
