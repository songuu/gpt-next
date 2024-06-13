
import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/config/server";

async function handle(req: NextRequest) {
  console.log("[Spark Route] params");

  const serverConfig = getServerSideConfig();

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const bearToken = req.headers.get("Authorization") ?? "";
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();

  const key = token ? token : serverConfig.qwenApiKey;

  if (!key) {
    return NextResponse.json(
      {
        error: true,
        message: `missing SPARK_API_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    sparkAppId: serverConfig.sparkAppId,
    sparkApiKey: serverConfig.sparkApiKey,
    sparkSecret: serverConfig.sparkSecret
  });
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";