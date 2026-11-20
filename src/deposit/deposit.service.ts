import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { DepositRepository } from './deposit.repository';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';
import { DepositDto } from './dto/deposit.dto';

/** Deposits belong to one account: every operation is scoped to the caller (see account-scope). */
@Injectable()
export class DepositService {
  constructor(private readonly depositRepository: DepositRepository) {}

  create(dto: CreateDepositDto, caller: Caller, accountId?: string): Promise<DepositDto> {
    return this.depositRepository.create(resolveTargetAccount(caller, accountId), dto);
  }

  findAll(caller: Caller, accountId?: string): Promise<DepositDto[]> {
    return this.depositRepository.findAll(resolveTargetAccount(caller, accountId));
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<DepositDto> {
    const deposit = await this.depositRepository.findOne(id, accountFilter(caller));
    if (!deposit) throw new NotFoundException(`Deposit ${id} not found`);
    return deposit;
  }

  async update(id: string, dto: UpdateDepositDto, caller: Caller): Promise<DepositDto> {
    await this.findOne(id, caller);
    return this.depositRepository.update(id, dto);
  }

  async remove(id: string, caller: Caller): Promise<DepositDto> {
    await this.findOne(id, caller);
    return this.depositRepository.remove(id);
  }
}
