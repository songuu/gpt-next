import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth';
import { getServerSideConfig } from '@/config/server';
import { ModelProvider, QIANFAN_BASE_URL } from '@/constant';

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const controller = new AbortController();

  const serverConfig = getServerSideConfig();
  let baseUrl = QIANFAN_BASE_URL.startsWith("http") ? QIANFAN_BASE_URL : `https://${QIANFAN_BASE_URL}`;
  baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if exists

  let path = req.nextUrl.pathname.replace("/api/qianfan/", "/");

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  const authResult = auth(req, ModelProvider.Qianfan);

  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const accessToken = await getAccessToken(serverConfig.qianfanAccess, serverConfig.qianfanSecret);
  const fetchUrl = `${baseUrl}${path}?access_token=${accessToken?.access_token}`;

  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    method: req.method,
    body: req.body,
    signal: controller.signal,
  };
  try {
    const response = await fetch(fetchUrl, fetchOptions)
    // const response = await axios.post(fetchUrl, req.body, {
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   signal: controller.signal,
    //   responseType: "stream"
    // });

    const newHeaders = new Headers(response.headers);
    newHeaders.delete("www-authenticate");
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("[Qianfan] Request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getAccessToken(AK: string, SK: string) {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
