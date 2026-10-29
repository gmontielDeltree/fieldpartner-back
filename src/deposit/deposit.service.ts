import { Injectable, NotFoundException } from '@nestjs/common';
import { DepositRepository } from './deposit.repository';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';

@Injectable()
export class DepositService {
  constructor(private readonly depositRepository: DepositRepository) {}

  create(dto: CreateDepositDto) {
    return this.depositRepository.create(dto);
  }

  findAll(accountId: string) {
    return this.depositRepository.findAll(accountId);
  }

  async findOne(id: string) {
    const deposit = await this.depositRepository.findOne(id);
    if (!deposit) throw new NotFoundException(`Deposit ${id} not found`);
    return deposit;
  }

  async update(id: string, dto: UpdateDepositDto) {
    await this.findOne(id);
    return this.depositRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.depositRepository.remove(id);
  }
}
