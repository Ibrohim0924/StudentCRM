import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admins')
  @Roles(UserRole.SUPERADMIN)
  createAdmin(@Body() dto: CreateAdminDto): Promise<User> {
    return this.usersService.createAdmin(dto);
  }

  @Post('users')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() current: AuthUser): Promise<User> {
    if (current.role === UserRole.ADMIN) {
      if (!current.branchId) {
        throw new ForbiddenException('Admin is missing branch assignment');
      }
      if (dto.branchId && dto.branchId !== current.branchId) {
        throw new ForbiddenException('Admins can only create users in their branch');
      }
      return this.usersService.createUser(dto, { role: UserRole.USER, branchId: current.branchId });
    }

    if (!dto.branchId) {
      throw new ForbiddenException('branchId is required for user creation');
    }
    return this.usersService.createUser(dto, { role: UserRole.USER, branchId: dto.branchId });
  }

  @Get()
  @Roles(UserRole.SUPERADMIN)
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('admins')
  @Roles(UserRole.SUPERADMIN)
  findAdmins(): Promise<User[]> {
    return this.usersService.findAdmins();
  }

  @Get('users')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findUsers(@CurrentUser() current: AuthUser): Promise<User[]> {
    if (current.role === UserRole.ADMIN) {
      if (!current.branchId) {
        throw new ForbiddenException('Admin is missing branch assignment');
      }
      return this.usersService.findUsersByBranch(current.branchId);
    }
    return this.usersService.findUsers();
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (current.role === UserRole.ADMIN) {
      if (user.role !== UserRole.USER || user.branchId !== current.branchId) {
        throw new ForbiddenException('Admins can only access users in their branch');
      }
    }
    return user;
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() current: AuthUser,
  ): Promise<User> {
    const target = await this.usersService.findOne(id);

    if (current.role === UserRole.ADMIN) {
      if (!current.branchId) {
        throw new ForbiddenException('Admin is missing branch assignment');
      }
      if (target.role !== UserRole.USER || target.branchId !== current.branchId) {
        throw new ForbiddenException('Admins can only update users in their branch');
      }
      if (dto.role && dto.role !== UserRole.USER) {
        throw new ForbiddenException('Admins cannot change user role');
      }
      return this.usersService.update(id, {
        ...dto,
        role: undefined,
        branchId: current.branchId,
      });
    }

    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<void> {
    const target = await this.usersService.findOne(id);

    if (current.role === UserRole.ADMIN) {
      if (!current.branchId) {
        throw new ForbiddenException('Admin is missing branch assignment');
      }

      if (target.role !== UserRole.USER || target.branchId !== current.branchId) {
        throw new ForbiddenException('Admins can only remove users in their branch');
      }
    }

    await this.usersService.remove(id, current);
  }
}
