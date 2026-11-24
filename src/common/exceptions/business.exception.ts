import { HttpException, HttpStatus } from '@nestjs/common';

export enum BusinessErrorCode {
  // ── Auth ──────────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS        = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED              = 'TOKEN_EXPIRED',
  TOKEN_INVALID              = 'TOKEN_INVALID',

  // ── Account ───────────────────────────────────────────────────────────────
  ACCOUNT_INACTIVE           = 'ACCOUNT_INACTIVE',
  ACCOUNT_SUSPENDED          = 'ACCOUNT_SUSPENDED',
  ACCOUNT_NOT_FOUND          = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_CHANNEL_NOT_ALLOWED = 'ACCOUNT_CHANNEL_NOT_ALLOWED',

  // ── User / Registration ───────────────────────────────────────────────────
  USER_NOT_FOUND             = 'USER_NOT_FOUND',
  EMAIL_ALREADY_REGISTERED   = 'EMAIL_ALREADY_REGISTERED',
  PASSWORD_POLICY_VIOLATION  = 'PASSWORD_POLICY_VIOLATION',

  // ── Licence ───────────────────────────────────────────────────────────────
  LICENCE_EXPIRED            = 'LICENCE_EXPIRED',
  LICENCE_LIMIT_EXCEEDED     = 'LICENCE_LIMIT_EXCEEDED',

  // ── Fields / lots (KAN-65) ────────────────────────────────────────────────
  GEOMETRY_INVALID           = 'GEOMETRY_INVALID',
  LOT_OUTSIDE_FIELD          = 'LOT_OUTSIDE_FIELD',
  LOT_OVERLAP                = 'LOT_OVERLAP',
  FIELD_LOTS_OUTSIDE         = 'FIELD_LOTS_OUTSIDE',
  LOT_LAYOUT_LOCKED          = 'LOT_LAYOUT_LOCKED',
  LOT_LAYOUT_IN_USE          = 'LOT_LAYOUT_IN_USE',
  RECORD_ARCHIVED            = 'RECORD_ARCHIVED',

  // ── General ───────────────────────────────────────────────────────────────
  INVALID_COUNTRY_CODE       = 'INVALID_COUNTRY_CODE',
  RECORD_NOT_FOUND           = 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY            = 'DUPLICATE_ENTRY',
  INVALID_REFERENCE          = 'INVALID_REFERENCE',
  VALIDATION_ERROR           = 'VALIDATION_ERROR',
  INTERNAL_ERROR             = 'INTERNAL_ERROR',
}

/**
 * Business-layer exception that carries a machine-readable `code` the frontend
 * can map to localized UI messages, retry logic, or specific error screens.
 *
 * Usage:
 *   throw new BusinessException(
 *     BusinessErrorCode.ACCOUNT_INACTIVE,
 *     'La cuenta está inactiva',
 *     HttpStatus.FORBIDDEN,
 *   );
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    /** Optional machine-readable context (e.g. the lots that block an operation). */
    public readonly details?: unknown,
  ) {
    super({ code, message, ...(details !== undefined && { details }) }, httpStatus);
  }
}
