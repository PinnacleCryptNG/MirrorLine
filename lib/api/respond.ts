import { NextResponse } from "next/server";
import { httpStatusForBitgetError, isBitgetError } from "@/lib/bitget/errors";

export const dynamic = "force-dynamic";

export function jsonError(error: unknown) {
  if (isBitgetError(error)) {
    return NextResponse.json(error.toJSON(), { status: httpStatusForBitgetError(error) });
  }
  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected server error",
    },
    { status: 500 },
  );
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
