import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountCategory, AccountStatus } from '@prisma/client';
import { AccountRepository } from './account.repository';
import { AccountBusiness } from './businessLogic/account.business';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateCountersDto } from './dto/update-counters.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly accountBusiness: AccountBusiness,
  ) {}

  create(dto: CreateAccountDto) {
    return this.accountBusiness.executeCreate(dto);
  }

  findAll(filters?: { category?: AccountCategory; status?: AccountStatus }) {
    return this.accountRepository.findAll(filters);
  }

  async findOne(id: string) {
    const account = await this.accountRepository.findOne(id);
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.accountRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.accountRepository.remove(id);
  }

  getLimits(id: string) {
    return this.accountBusiness.getLimits(id);
  }

  updateCounters(id: string, dto: UpdateCountersDto) {
    return this.accountBusiness.updateCounters(id, dto);
  }
}
