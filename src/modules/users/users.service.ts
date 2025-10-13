import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Branch } from '../branches/entities/branch.entity';

interface CreateOptions {
  role: UserRole;
  branchId?: number;
}

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async ensureSuperadmin(email: string, fullName: string, password: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email },
      withDeleted: false,
    });
    if (existing) {
      if (existing.role !== UserRole.SUPERADMIN) {
        existing.role = UserRole.SUPERADMIN;
        return this.userRepository.save(existing);
      }
      return existing;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const superadmin = this.userRepository.create({
      email: email.toLowerCase(),
      fullName,
      password: hashed,
      role: UserRole.SUPERADMIN,
    });
    const saved = await this.userRepository.save(superadmin);
    this.logger.log(`Superadmin ensured: email=${email}`);
    return saved;
  }

  async createAdmin(dto: CreateAdminDto): Promise<User> {
    await this.verifyBranch(dto.branchId);
    return this.createUserInternal(dto, { role: UserRole.ADMIN, branchId: dto.branchId });
  }

  async createUser(dto: CreateUserDto, options?: CreateOptions): Promise<User> {
    const role = options?.role ?? UserRole.USER;
    const branchId = options?.branchId ?? dto.branchId;

    if (role !== UserRole.SUPERADMIN && !branchId) {
      throw new BadRequestException('branchId is required');
    }

    if (branchId) {
      await this.verifyBranch(branchId);
    }

    return this.createUserInternal(dto, { role, branchId: branchId ?? undefined });
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { branch: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.ADMIN },
      relations: { branch: true },
      order: { fullName: 'ASC' },
    });
  }

  findUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.USER },
      relations: { branch: true },
      order: { fullName: 'ASC' },
    });
  }

  findUsersByBranch(branchId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.USER, branchId },
      relations: { branch: true },
      order: { fullName: 'ASC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { branch: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    if (withPassword) {
      return this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .leftJoinAndSelect('user.branch', 'branch')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();
    }
    return this.userRepository.findOne({
      where: { email },
      relations: { branch: true },
    });
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailAvailable(dto.email, id);
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.branchId !== undefined) {
      if (dto.branchId === null) {
        user.branchId = null;
      } else {
        await this.verifyBranch(dto.branchId);
        user.branchId = dto.branchId;
      }
    }

    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: { id: number; role: UserRole }): Promise<void> {
    const user = await this.findOne(id);

    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException('Superadmin cannot be deleted');
    }

    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.userRepository.remove(user);
  }

  sanitize(user: User): User {
    if ('password' in user) {
      delete (user as any).password;
    }
    return user;
  }

  private async createUserInternal(
    dto: CreateAdminDto | CreateUserDto,
    options: CreateOptions,
  ): Promise<User> {
    await this.ensureEmailAvailable(dto.email);
    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      password: hashed,
      role: options.role,
      branchId: options.branchId ?? null,
    });

    return this.userRepository.save(user);
  }

  private async ensureEmailAvailable(email: string, ignoreUserId?: number): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing && existing.id !== ignoreUserId) {
      throw new ConflictException('User with this email already exists');
    }
  }

  private async verifyBranch(branchId: number): Promise<void> {
    const exists = await this.branchRepository.exists({ where: { id: branchId } });
    if (!exists) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }
  }
}
