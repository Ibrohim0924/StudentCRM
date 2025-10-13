import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { User, UserRole } from '../users/entities/user.entity';

interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  branchId?: number | null;
  fullName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(dto: SignInDto) {
    const user = await this.validateUser(dto.email, dto.password);
    return this.buildAuthResponse(user);
  }

  async signUp(dto: SignUpDto) {
    const created = await this.usersService.createUser(dto, {
      role: UserRole.USER,
      branchId: dto.branchId,
    });
    const user = await this.usersService.findOne(created.id);
    return this.buildAuthResponse(user);
  }

  async buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId ?? null,
      fullName: user.fullName,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: this.usersService.sanitize(user),
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, (user as any).password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.usersService.findOne(user.id);
  }
}
