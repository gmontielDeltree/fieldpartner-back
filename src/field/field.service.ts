import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { RemovalResultDto } from '../common/dto/removal-result.dto';
import { FieldRepository } from './field.repository';
import { FieldBusiness } from './businessLogic/field.business';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { FieldDto } from './dto/field.dto';

/** Fields belong to one account: every operation is scoped to the caller (see account-scope). */
@Injectable()
export class FieldService {
  constructor(
    private readonly fieldRepository: FieldRepository,
    private readonly fieldBusiness: FieldBusiness,
  ) {}

  create(dto: CreateFieldDto, caller: Caller, accountId?: string): Promise<FieldDto> {
    return this.fieldBusiness.create(resolveTargetAccount(caller, accountId), dto);
  }

  findAll(caller: Caller, accountId?: string, includeArchived = false): Promise<FieldDto[]> {
    return this.fieldRepository.findAll(resolveTargetAccount(caller, accountId), includeArchived);
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<FieldDto> {
    const field = await this.fieldRepository.findOne(id, accountFilter(caller));
    if (!field) throw new NotFoundException(`Field ${id} not found`);
    return field;
  }

  async update(id: string, dto: UpdateFieldDto, caller: Caller): Promise<FieldDto> {
    return this.fieldBusiness.update(await this.findOne(id, caller), dto);
  }

  async remove(id: string, caller: Caller): Promise<RemovalResultDto> {
    return this.fieldBusiness.remove(await this.findOne(id, caller));
  }
}
