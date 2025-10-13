import { UserRole } from '../../modules/users/entities/user.entity';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  branchId?: number | null;
  iat?: number;
  exp?: number;
}
