import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@control/database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; firstName: string; lastName: string; role: Role }) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese email');

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: { email?: string; firstName?: string; lastName?: string; role?: Role; isActive?: boolean; newPassword?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (data.email && data.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (exists) throw new ConflictException('Ya existe un usuario con ese email');
    }

    const updateData: any = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: data.isActive,
    };
    if (data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes desactivarte a ti mismo');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true },
    });
  }
}