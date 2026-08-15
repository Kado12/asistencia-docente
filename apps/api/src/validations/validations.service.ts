import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetValidationDto } from './dto/set-validation.dto';

const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
};

@Injectable()
export class ValidationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Estado de validación de todos los docentes para una semana,
   * junto con sus estadísticas de la semana (para que el coordinador revise)
   */
  async getWeekStatus(periodId: string, weekNumber: number) {
    const period = await this.prisma.period.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Período no encontrado');

    const start = addDays(period.startDate, (weekNumber - 1) * 7);
    const end = addDays(start, 4);

    // Docentes con clases en el período
    const teachers = await this.prisma.teacher.findMany({
      where: {
        isActive: true,
        classes: { some: { periodId, isActive: true } },
      },
      include: {
        validations: { where: { periodId, weekNumber } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Asistencia de la semana agrupada por docente
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        teacherClass: { periodId },
      },
      include: { teacherClass: true },
    });

    const byTeacher = new Map<string, { hours: number; presents: number; absents: number; lateMinutes: number }>();
    for (const r of records) {
      const id = r.teacherClass.teacherId;
      if (!byTeacher.has(id)) {
        byTeacher.set(id, { hours: 0, presents: 0, absents: 0, lateMinutes: 0 });
      }
      const g = byTeacher.get(id)!;
      if (r.status === 'PRESENT') {
        g.presents++;
        g.hours += r.teacherClass.hours;
        g.lateMinutes += r.lateMinutes;
      } else {
        g.absents++;
      }
    }

    return teachers.map((t) => ({
      teacher: {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        dni: t.dni,
      },
      stats: byTeacher.get(t.id) || { hours: 0, presents: 0, absents: 0, lateMinutes: 0 },
      validation: t.validations[0] || null,
    }));
  }

  /**
   * El coordinador marca la semana como Validada o Con Observaciones
   */
  async setStatus(dto: SetValidationDto, userId: string) {
    return this.prisma.weekValidation.upsert({
      where: {
        teacherId_periodId_weekNumber: {
          teacherId: dto.teacherId,
          periodId: dto.periodId,
          weekNumber: dto.weekNumber,
        },
      },
      update: {
        status: dto.status,
        comment: dto.comment || null,
        validatedById: userId,
      },
      create: {
        teacherId: dto.teacherId,
        periodId: dto.periodId,
        weekNumber: dto.weekNumber,
        status: dto.status,
        comment: dto.comment || null,
        validatedById: userId,
      },
      include: {
        validatedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }
}