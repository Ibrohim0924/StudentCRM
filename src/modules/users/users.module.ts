import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
import { SuperadminSeeder } from './superadmin.seeder';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, Branch])],
  providers: [UsersService, SuperadminSeeder],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
