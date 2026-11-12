import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { RolesGuard, Caller } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Authenticated by the global JwtAuthGuard; RolesGuard enforces the role allow-list
// and resolves req.caller (role + accountId) used for result scoping.
@Controller('users')
@UseGuards(RolesGuard)
@Roles(UserRole.GENERAL_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lists users grouped by account, scoped to the caller's role (see service). */
  @Get()
  findAll(@Req() req: Request & { caller: Caller }) {
    return this.usersService.listForCaller(req.caller);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string, @Req() req: Request & { caller: Caller }) {
    const user = await this.usersService.findByEmailForCaller(email, req.caller);
    if (!user) throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    return user;
  }

  /** Creates a user scoped to the caller (see service). */
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: Request & { caller: Caller }) {
    return this.usersService.create(dto, req.caller);
  }

  /** Updates username / resets password, scoped to the caller (see service). */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.usersService.update(id, dto, req.caller);
  }
}
