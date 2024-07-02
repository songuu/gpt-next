import { NextRequest, NextResponse } from "next/server";

import { MOONSHOT_BASE_URL, ModelProvider } from "@/constant";
import { getServerSideConfig } from "@/config/server";
import { prettyObject } from "@/utils/format";

import { auth } from "../../auth";

async function handle(req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log("[Moonshot Route] params");

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const serverConfig = getServerSideConfig();

  const controller = new AbortController();

  let baseUrl = serverConfig.moonshotUrl || MOONSHOT_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  let path = `${req.nextUrl.pathname}`.replaceAll("/api/moonshot", "");


  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  const authResult = auth(req, ModelProvider.Moonshot);

  console.log("[authResult] ", authResult)
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const bearToken = req.headers.get("Authorization") ?? "";
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();

  const key = token ? token : serverConfig.moonshotApiKey;

  if (!key) {
    return NextResponse.json(
      {
        error: true,
        message: `missing MOONSHOT_API_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }

  const fetchUrl = `${baseUrl}${path}`;

  const fetchOptions: RequestInit = {
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
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

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("[Moonshot] ", e);
    return NextResponse.json(prettyObject(e));
  } finally {
    clearTimeout(timeoutId);
  }
}
export const GET = handle;
export const POST = handle;

export const runtime = "edge";