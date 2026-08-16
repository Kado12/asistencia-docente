import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherClassDto, UpdateTeacherClassDto } from './dto/teacher-class.dto';

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

@Injectable()
export class TeacherClassesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeacherClassDto) {
    return this.prisma.teacherClass.create({
      data: {
        ...dto,
        hours: dto.hours || 3,
      },
      include: {
        teacher: true,
        course: { include: { area: true } },
        sede: true,
        classroom: true,
      },
    });
  }

  async findAll(filters: {
    teacherId?: string;
    sedeId?: string;
    dayOfWeek?: number;
    periodId?: string;
  }) {
    const where: any = { isActive: true };

    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.sedeId) where.sedeId = filters.sedeId;
    if (filters.dayOfWeek) where.dayOfWeek = filters.dayOfWeek;
    if (filters.periodId) where.periodId = filters.periodId;

    return this.prisma.teacherClass.findMany({
      where,
      include: {
        block: true,
        teacher: true,
        course: { include: { area: true } },
        sede: true,
        classroom: true,
        period: true,
      },
      orderBy: [
        { sede: { name: 'asc' } },
        { dayOfWeek: 'asc' },
        { teacher: { lastName: 'asc' } },
      ],
    });
  }

  async update(id: string, dto: UpdateTeacherClassDto) {
    const exists = await this.prisma.teacherClass.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Clase no encontrada');

    console.log(dto)

    return this.prisma.teacherClass.update({
      where: { id },
      data: dto,
      include: {
        block: true,
        teacher: true,
        course: { include: { area: true } },
        sede: true,
        classroom: true,
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.teacherClass.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Clase no encontrada');

    // Soft delete
    return this.prisma.teacherClass.update({
      where: { id },
      data: { isActive: false },
    });
  }
}