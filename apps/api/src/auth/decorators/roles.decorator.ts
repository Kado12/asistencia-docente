import { SetMetadata } from '@nestjs/common';
import { Role } from '@control/database';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);