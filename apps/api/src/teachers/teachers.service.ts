import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeacherDto) {
    const exists = await this.prisma.teacher.findUnique({ where: { dni: dto.dni } });
    if (exists) throw new ConflictException('Ya existe un docente con ese DNI');

    return this.prisma.teacher.create({ data: dto });
  }

  async findAll(filters: { search?: string; page?: number; limit?: number }) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { dni: { contains: filters.search } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
        include: { _count: { select: { classes: true } } },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            course: { include: { area: true } },
            sede: true,
            classroom: true,
          },
        },
      },
    });
    if (!teacher) throw new NotFoundException('Docente no encontrado');
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    await this.findOne(id);

    if (dto.dni) {
      const exists = await this.prisma.teacher.findFirst({
        where: { dni: dto.dni, NOT: { id } },
      });
      if (exists) throw new ConflictException('Ya existe un docente con ese DNI');
    }

    return this.prisma.teacher.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: desactivar en lugar de eliminar
    return this.prisma.teacher.update({ where: { id }, data: { isActive: false } });
  }
}