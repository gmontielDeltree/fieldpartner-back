import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { InputRepository } from './input.repository';
import { InputBusiness } from './businessLogic/input.business';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';
import { InputDto } from './dto/input.dto';

/** Inputs are scoped to the caller's account; platform inputs are readable by everyone. */
@Injectable()
export class InputService {
  constructor(
    private readonly inputRepository: InputRepository,
    private readonly inputBusiness: InputBusiness,
  ) {}

  async create(dto: CreateInputDto, caller: Caller, accountId?: string): Promise<InputDto> {
    const owner = this.inputBusiness.resolveOwner(caller, accountId);
    await this.inputBusiness.assertReplacementVisible(dto.replacementId, owner);
    return this.inputRepository.create(owner, dto);
  }

  /** Without `accountId`: the platform catalog. With it: that account's own inputs (scoped). */
  findAll(caller: Caller, accountId?: string): Promise<InputDto[]> {
    return this.inputRepository.findAll(accountId ? resolveTargetAccount(caller, accountId) : null);
  }

  findAllByAccount(caller: Caller, accountId: string): Promise<InputDto[]> {
    return this.inputRepository.findAllByAccount(resolveTargetAccount(caller, accountId));
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<InputDto> {
    const input = await this.inputRepository.findOne(id, accountFilter(caller));
    if (!input) throw new NotFoundException(`Input ${id} not found`);
    return input;
  }

  async update(id: string, dto: UpdateInputDto, caller: Caller): Promise<InputDto> {
    const input = await this.findOne(id, caller);
    this.inputBusiness.assertCanWrite(caller, input);
    await this.inputBusiness.assertReplacementVisible(dto.replacementId, input.accountId);
    return this.inputRepository.update(id, dto);
  }

  async remove(id: string, caller: Caller): Promise<InputDto> {
    const input = await this.findOne(id, caller);
    this.inputBusiness.assertCanWrite(caller, input);
    return this.inputRepository.remove(id);
  }
}
