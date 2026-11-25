import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { ReplaceMenuPermissionsDto } from './dto/menu-permissions.dto';

type CallerRequest = Request & { caller: Caller };

// Authenticated by the global JwtAuthGuard; RolesGuard enforces the role allow-list
// and resolves req.caller (role + accountId) used for result scoping.
@Controller('users')
@UseGuards(RolesGuard)
@Roles(UserRole.GENERAL_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lists users grouped by account, scoped to the caller's role (see service). */
  @Get()
  findAll(@Req() req: CallerRequest) {
    return this.usersService.listForCaller(req.caller);
  }

  // `me` is declared before `:id` so it is not taken as an id.
  /** The caller's own user with its menu permissions (any role: the front reloads the menu from it). */
  @Get('me')
  @Roles(UserRole.GENERAL_ADMIN, UserRole.ADMIN, UserRole.USER)
  findMe(@Req() req: CallerRequest) {
    return this.usersService.findMe(req.caller);
  }

  /** The caller's own name, language and photo (any role). */
  @Patch('me')
  @Roles(UserRole.GENERAL_ADMIN, UserRole.ADMIN, UserRole.USER)
  updateMe(@Body() dto: UpdateOwnProfileDto, @Req() req: CallerRequest) {
    return this.usersService.updateMe(dto, req.caller);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string, @Req() req: CallerRequest) {
    const user = await this.usersService.findByEmailForCaller(email, req.caller);
    if (!user) throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    return user;
  }

  /** A user with its menu permissions; another account's user is a 404. */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: CallerRequest) {
    return this.usersService.findOne(id, req.caller);
  }

  /** Creates a user (and its menu permissions) scoped to the caller (see service). */
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: CallerRequest) {
    return this.usersService.create(dto, req.caller);
  }

  /** Updates username / resets password, scoped to the caller (see service). */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: CallerRequest,
  ) {
    return this.usersService.update(id, dto, req.caller);
  }

  /** Replaces the whole set of menus the user may open (KAN-57). */
  @Put(':id/permissions')
  replacePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceMenuPermissionsDto,
    @Req() req: CallerRequest,
  ) {
    return this.usersService.replacePermissions(id, dto.menuIds, req.caller);
  }
}
