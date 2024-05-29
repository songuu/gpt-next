import { getServerSideConfig } from "@/config/server";
import { ModelProvider, OpenaiPath } from "@/constant";
import { prettyObject } from "@/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Qwen Route] params ", params);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";