import { getServerSideConfig } from "@/config/server";
import { ModelProvider, QIANFAN_BASE_URL } from "@/constant";
import { prettyObject } from "@/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";

import {
  getTimestampString,
  getQueryString,
  getAuthString
} from './util'

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

  let baseUrl = QIANFAN_BASE_URL;
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  let path = `${req.nextUrl.pathname}`.replaceAll("/api/qianfan/", "");

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  const authResult = auth(req, ModelProvider.Qianfan);

  console.log("[authResult] ", authResult)
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const timestamp = getTimestampString();
  const queryString = getQueryString(params);
  const authrization = getAuthString(path, queryString, timestamp);

  const fetchUrl = `${baseUrl}/${path}`;

  const fetchOptions: RequestInit = {
    headers: {
      "Authorization": authrization,
      "Content-Type": "application/json",
      "Host": 'dasd',
      "x-bce-date": timestamp
    },
    method: req.method,
    body: req.body,
    signal: controller.signal,
  };


  try {
    const res = await fetch(fetchUrl, fetchOptions)

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
    // console.error("[Qianfan] ", e);
    return NextResponse.json(prettyObject(e));
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";