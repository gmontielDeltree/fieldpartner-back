import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { Caller } from '../../auth/roles.guard';
import { isGeneralAdmin, resolveTargetAccount } from '../../auth/account-scope';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { InputRepository } from '../input.repository';

/**
 * Ownership rules for inputs. Platform inputs (accountId null) are a global catalog:
 * anyone authenticated reads them, only a GENERAL_ADMIN writes them.
 */
@Injectable()
export class InputBusiness {
  constructor(private readonly inputRepository: InputRepository) {}

  /**
   * Owner of a new input: a GENERAL_ADMIN picks an account with `requested` or, without it,
   * creates a platform input (null); everyone else creates in their own account.
   */
  resolveOwner(caller: Caller, requested?: string): string | null {
    if (isGeneralAdmin(caller)) return requested ?? null;
    return resolveTargetAccount(caller, requested);
  }

  /** Only a GENERAL_ADMIN may modify or delete a platform input. */
  assertCanWrite(caller: Caller, input: { accountId: string | null }): void {
    if (input.accountId === null && !isGeneralAdmin(caller)) {
      throw new ForbiddenException('Los insumos de plataforma solo los modifica un administrador general');
    }
  }

  /** The replacement must be an input the owner can see (own account or platform). */
  async assertReplacementVisible(replacementId: string | null | undefined, ownerAccountId: string | null) {
    if (!replacementId) return;
    if (!(await this.inputRepository.isVisibleTo(replacementId, ownerAccountId))) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        'El insumo de reemplazo indicado no existe en la cuenta',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
