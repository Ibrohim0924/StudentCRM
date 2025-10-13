import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Injectable()
export class SuperadminSeeder implements OnModuleInit {
  private readonly logger = new Logger(SuperadminSeeder.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.configService.get<string>('SUPERADMIN_EMAIL');
    const password = this.configService.get<string>('SUPERADMIN_PASSWORD');
    const fullName = this.configService.get<string>('SUPERADMIN_FULL_NAME');

    if (!email || !password || !fullName) {
      this.logger.warn('Superadmin credentials are not fully configured');
      return;
    }

    await this.usersService.ensureSuperadmin(email, fullName, password);
  }
}
