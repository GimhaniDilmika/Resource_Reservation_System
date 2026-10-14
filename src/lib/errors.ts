import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode = "BAD_REQUEST", statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFLICT", 409, details);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export function handleApiError(err: unknown) {
  console.error("API Error:", err);

  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed: " + err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
          details: err.flatten(),
        },
      },
      { status: 400 }
    );
  }

  // Handle PostgreSQL exclusion constraint error code 23P01
  const dbError = err as { code?: string; message?: string };
  if (dbError && dbError.code === "23P01") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "The requested time slot conflicts with an existing confirmed reservation for this resource.",
        },
      },
      { status: 409 }
    );
  }

  const message = err instanceof Error ? err.message : "An unexpected server error occurred";
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
      },
    },
    { status: 500 }
  );
}
