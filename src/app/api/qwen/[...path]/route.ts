import { getServerSideConfig } from "@/config/server";
import { ModelProvider, QWEN_BASE_URL } from "@/constant";
import { prettyObject } from "@/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Qwen Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const controller = new AbortController();

  const serverConfig = getServerSideConfig();

  let baseUrl = serverConfig.qwenUrl || QWEN_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  let path = `${req.nextUrl.pathname}`.replaceAll("/api/qwen/", "api/v1/");

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  const authResult = auth(req, ModelProvider.Qwen);

  console.log("[authResult] ", authResult)
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const bearToken = req.headers.get("Authorization") ?? "";
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();

  const key = token ? token : serverConfig.qwenApiKey;

  if (!key) {
    return NextResponse.json(
      {
        error: true,
        message: `missing QWEN_API_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }

  const fetchUrl = `${baseUrl}/${path}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-DashScope-SSE": "enable"
    },
    method: req.method,
    body: req.body,
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    // console.log("res====>", res.body)

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("[Qwen] ", e);
    return NextResponse.json(prettyObject(e));
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";