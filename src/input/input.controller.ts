import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InputService } from './input.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';

@Controller('inputs')
export class InputController {
  constructor(private readonly inputService: InputService) {}

  @Post()
  create(@Body() dto: CreateInputDto) {
    return this.inputService.create(dto);
  }

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.inputService.findAll(accountId);
  }

  @Get('by-account/:accountId')
  findAllByAccount(@Param('accountId') accountId: string) {
    return this.inputService.findAllByAccount(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inputService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInputDto) {
    return this.inputService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inputService.remove(id);
  }
}
