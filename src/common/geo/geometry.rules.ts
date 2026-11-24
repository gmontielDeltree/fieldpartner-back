import { HttpStatus } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../exceptions/business.exception';
import { GeometryHex, NormalizedGeometry } from './geometry.repository';

/** The normalized geometry, or a 400 with the reason PostGIS gives (ST_IsValidReason). */
export function requireUsableGeometry(result: NormalizedGeometry): GeometryHex {
  if (!result.valid) {
    throw new BusinessException(
      BusinessErrorCode.GEOMETRY_INVALID,
      `La geometría no es válida: ${result.reason ?? 'sin detalle'}`,
      HttpStatus.BAD_REQUEST,
      { reason: result.reason },
    );
  }
  if (!result.hex) {
    throw new BusinessException(
      BusinessErrorCode.GEOMETRY_INVALID,
      'La geometría queda vacía (es demasiado chica o no tiene superficie)',
      HttpStatus.BAD_REQUEST,
    );
  }
  return result.hex;
}

/** 0.0123 → 1.23 (percent, two decimals) for messages and details. */
export const toPercent = (ratio: number): number => Math.round(ratio * 10_000) / 100;
