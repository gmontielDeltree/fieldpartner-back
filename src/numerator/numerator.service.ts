import { Injectable } from '@nestjs/common';
import { NumeratorType } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { resolveTargetAccount } from '../auth/account-scope';
import { NumeratorRepository } from './numerator.repository';
import { NumeratorDto, NumeratorNumberDto } from './dto/numerator.dto';

/**
 * Per-account number sequences (withdrawal orders, work orders, purchase orders, cereal sale
 * contracts). Every operation is scoped to the caller's account (see account-scope).
 */
@Injectable()
export class NumeratorService {
  constructor(private readonly numeratorRepository: NumeratorRepository) {}

  findAll(caller: Caller, accountId?: string): Promise<NumeratorDto[]> {
    return this.numeratorRepository.findAll(resolveTargetAccount(caller, accountId));
  }

  /** The number `take` would return now. Only for display: it reserves nothing. */
  async peek(type: NumeratorType, caller: Caller, accountId?: string): Promise<NumeratorNumberDto> {
    const last = await this.numeratorRepository.findLast(resolveTargetAccount(caller, accountId), type);
    return { numeratorType: type, number: last + 1 };
  }

  /** Reserves and returns the next number (1 the first time). */
  async take(type: NumeratorType, caller: Caller, accountId?: string): Promise<NumeratorNumberDto> {
    const number = await this.numeratorRepository.takeNext(resolveTargetAccount(caller, accountId), type);
    return { numeratorType: type, number };
  }
}
