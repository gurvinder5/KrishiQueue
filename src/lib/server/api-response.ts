import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/errors";

export interface ApiSuccessPayload<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function jsonSuccess<T>(data: T, statusCode: number = 200, meta?: any) {
  const body: ApiSuccessPayload<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status: statusCode });
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    const body: ApiErrorPayload = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return NextResponse.json(body, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const body: ApiErrorPayload = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  console.error("Unhandled API Server Error:", error);
  const body: ApiErrorPayload = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  };
  return NextResponse.json(body, { status: 500 });
}
