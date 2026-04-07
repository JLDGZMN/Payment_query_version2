import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { getServerConfigErrorMessage } from "@/lib/server-env";

export const runtime = "nodejs";

let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function getAuthHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }

  return handlers;
}

function getConfigErrorResponse() {
  const error = getServerConfigErrorMessage();

  if (!error) {
    return null;
  }

  return NextResponse.json({ error }, { status: 500 });
}

export async function GET(request: Request) {
  const configError = getConfigErrorResponse();

  if (configError) {
    return configError;
  }

  return getAuthHandlers().GET(request);
}

export async function POST(request: Request) {
  const configError = getConfigErrorResponse();

  if (configError) {
    return configError;
  }

  return getAuthHandlers().POST(request);
}
