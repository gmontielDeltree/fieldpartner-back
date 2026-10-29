import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { BusinessErrorCode, BusinessException } from '../exceptions/business.exception';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    const { statusCode, code, message, errors } = this.normalize(exception);

    // Log 5xx as errors, 4xx as warnings (expected business failures are noise at error level)
    if (statusCode >= 500) {
      this.logger.error(`[${code}] ${message}`, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`[${code}] ${statusCode} ${request.method} ${request.url} — ${message}`);
    }

    const body: ErrorResponse = {
      statusCode,
      code,
      message,
      ...(errors?.length && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    errors?: string[];
  } {
    // ── BusinessException (our domain errors with explicit code) ─────────────
    if (exception instanceof BusinessException) {
      const body = exception.getResponse() as { code: string; message: string };
      return {
        statusCode: exception.getStatus(),
        code:       body.code,
        message:    body.message,
      };
    }

    // ── NestJS HttpException (includes ValidationPipe BadRequestException) ───
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body       = exception.getResponse();

      // ValidationPipe throws BadRequestException with message[] — detect and format
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        Array.isArray((body as any).message)
      ) {
        return {
          statusCode,
          code:    BusinessErrorCode.VALIDATION_ERROR,
          message: 'Datos inválidos en la solicitud',
          errors:  (body as any).message as string[],
        };
      }

      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && 'message' in body
            ? String((body as any).message)
            : exception.message;

      return {
        statusCode,
        code:    this.httpStatusToCode(statusCode),
        message,
      };
    }

    // ── Prisma known request errors ───────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalizePrismaError(exception);
    }

    // ── Prisma validation errors (schema mismatch, wrong types, etc.) ─────────
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code:       BusinessErrorCode.VALIDATION_ERROR,
        message:    'Error de validación en la base de datos',
      };
    }

    // ── Unknown / unhandled ───────────────────────────────────────────────────
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code:       BusinessErrorCode.INTERNAL_ERROR,
      message:    'Error interno del servidor',
    };
  }

  private normalizePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          statusCode: HttpStatus.CONFLICT,
          code:       BusinessErrorCode.DUPLICATE_ENTRY,
          message:    'Ya existe un registro con esos datos',
        };
      case 'P2025': // Record not found (update/delete on non-existing row)
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code:       BusinessErrorCode.RECORD_NOT_FOUND,
          message:    'Registro no encontrado',
        };
      case 'P2003': // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code:       BusinessErrorCode.INVALID_REFERENCE,
          message:    'Referencia a un registro que no existe',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code:       BusinessErrorCode.INTERNAL_ERROR,
          message:    `Error de base de datos (${error.code})`,
        };
    }
  }

  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: BusinessErrorCode.TOKEN_INVALID,
      403: 'FORBIDDEN',
      404: BusinessErrorCode.RECORD_NOT_FOUND,
      409: BusinessErrorCode.DUPLICATE_ENTRY,
      422: BusinessErrorCode.VALIDATION_ERROR,
    };
    return map[status] ?? BusinessErrorCode.INTERNAL_ERROR;
  }
}
