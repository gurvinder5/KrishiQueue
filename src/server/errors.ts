export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SLOT_CAPACITY_EXCEEDED"
  | "SLOT_NOT_AVAILABLE"
  | "DUPLICATE_BOOKING"
  | "BOOKING_CANNOT_BE_CANCELLED"
  | "INVALID_CREDENTIALS"
  | "USER_ALREADY_EXISTS"
  | "CENTER_INACTIVE"
  | "CROP_NOT_ACCEPTED"
  | "MOISTURE_EXCEEDED"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: ErrorCode = "VALIDATION_ERROR", details?: any) {
    return new AppError(code, message, 400, details);
  }

  static unauthorized(message: string = "Authentication required") {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message: string = "Access denied for this role") {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message: string = "Resource not found") {
    return new AppError("NOT_FOUND", message, 404);
  }

  static conflict(message: string, code: ErrorCode = "CONFLICT") {
    return new AppError(code, message, 409);
  }

  static slotCapacityExceeded(message: string = "Selected slot capacity is full") {
    return new AppError("SLOT_CAPACITY_EXCEEDED", message, 409);
  }

  static internal(message: string = "An unexpected internal server error occurred") {
    return new AppError("INTERNAL_SERVER_ERROR", message, 500);
  }
}
