import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

    // ===== BLOQUES =====

  async createBlock(data: { periodId: string; name: string; startWeek: number; endWeek: number }) {
    const period = await this.prisma.period.findUnique({ where: { id: data.periodId } });
    if (!period) throw new NotFoundException('Período no encontrado');

    if (data.startWeek < 1 || data.endWeek > period.weeks || data.startWeek > data.endWeek) {
      throw new BadRequestException(
        `Las semanas deben estar entre 1 y ${period.weeks}, y el inicio no puede ser mayor al fin`,
      );
    }

    return this.prisma.block.create({ data });
  }

  async findAllBlocks(periodId?: string) {
    return this.prisma.block.findMany({
      where: periodId ? { periodId } : {},
      include: { period: true, _count: { select: { classes: true } } },
      orderBy: [{ periodId: 'asc' }, { startWeek: 'asc' }],
    });
  }

  async updateBlock(id: string, data: { name?: string; startWeek?: number; endWeek?: number }) {
    const block = await this.prisma.block.findUnique({ where: { id }, include: { period: true } });
    if (!block) throw new NotFoundException('Bloque no encontrado');

    const startWeek = data.startWeek ?? block.startWeek;
    const endWeek = data.endWeek ?? block.endWeek;

    if (startWeek < 1 || endWeek > block.period.weeks || startWeek > endWeek) {
      throw new BadRequestException('Rango de semanas inválido');
    }

    return this.prisma.block.update({ where: { id }, data });
  }

  async deleteBlock(id: string) {
    const block = await this.prisma.block.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!block) throw new NotFoundException('Bloque no encontrado');
    if (block.classes.length > 0) {
      throw new ConflictException(
        'No se puede eliminar: tiene clases asignadas. Reasígnalas o elimínalas primero.',
      );
    }
    return this.prisma.block.delete({ where: { id } });
  }

  // ===== PERÍODOS =====

  async createPeriod(name: string, startDate: string, weeks: number) {
    const exists = await this.prisma.period.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Ya existe un período con ese nombre');

    const date = new Date(`${startDate}T00:00:00Z`);
    if (date.getUTCDay() !== 1) {
      throw new BadRequestException('La fecha de inicio debe ser un LUNES (la semana es L-V)');
    }

    return this.prisma.period.create({
      data: { name, startDate: date, weeks: weeks || 12, isActive: true },
    });
  }

  async updatePeriod(id: string, data: { name?: string; startDate?: string; weeks?: number; isActive?: boolean }) {
    const updateData: any = { ...data };
    if (data.startDate) {
      const date = new Date(`${data.startDate}T00:00:00Z`);
      if (date.getUTCDay() !== 1) {
        throw new BadRequestException('La fecha de inicio debe ser un LUNES');
      }
      updateData.startDate = date;
    }
    return this.prisma.period.update({ where: { id }, data: updateData });
  }

  async deletePeriod(id: string) {
    const period = await this.prisma.period.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!period) throw new NotFoundException('Período no encontrado');
    if (period.classes.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene clases asignadas. Desactívalo en su lugar.');
    }
    return this.prisma.period.delete({ where: { id } });
  }

  // ===== ÁREAS =====

  async createArea(name: string) {
    const exists = await this.prisma.area.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Ya existe un área con ese nombre');
    return this.prisma.area.create({ data: { name } });
  }

  async findAllAreas() {
    return this.prisma.area.findMany({
      include: { courses: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateArea(id: string, name: string) {
    return this.prisma.area.update({ where: { id }, data: { name } });
  }

  async deleteArea(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: { courses: true },
    });
    if (!area) throw new NotFoundException('Área no encontrada');
    if (area.courses.length > 0) {
      throw new ConflictException('No se puede eliminar: el área tiene cursos asociados');
    }
    return this.prisma.area.delete({ where: { id } });
  }

  // ===== CURSOS =====

  async createCourse(name: string, areaId: string) {
    return this.prisma.course.create({ data: { name, areaId } });
  }

  async updateCourse(id: string, data: { name?: string; areaId?: string }) {
    return this.prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    if (course.classes.length > 0) {
      throw new ConflictException('No se puede eliminar: el curso tiene clases asignadas');
    }
    return this.prisma.course.delete({ where: { id } });
  }

  // ===== SEDES =====

  async createSede(name: string) {
    const exists = await this.prisma.sede.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Ya existe una sede con ese nombre');
    return this.prisma.sede.create({ data: { name } });
  }

  async findAllSedes() {
    return this.prisma.sede.findMany({
      include: { classrooms: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateSede(id: string, name: string) {
    return this.prisma.sede.update({ where: { id }, data: { name } });
  }

  async deleteSede(id: string) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      include: { classrooms: true, classes: true },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    if (sede.classrooms.length > 0 || sede.classes.length > 0) {
      throw new ConflictException('No se puede eliminar: la sede tiene salones o clases');
    }
    return this.prisma.sede.delete({ where: { id } });
  }

  // ===== SALONES =====

  async createClassroom(name: string, sedeId: string) {
    const exists = await this.prisma.classroom.findFirst({
      where: { name, sedeId },
    });
    if (exists) throw new ConflictException('Ya existe un salón con ese nombre en la sede');
    return this.prisma.classroom.create({ data: { name, sedeId } });
  }

  async updateClassroom(id: string, data: { name?: string; sedeId?: string }) {
    return this.prisma.classroom.update({ where: { id }, data });
  }

  async deleteClassroom(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!classroom) throw new NotFoundException('Salón no encontrado');
    if (classroom.classes.length > 0) {
      throw new ConflictException('No se puede eliminar: el salón tiene clases asignadas');
    }
    return this.prisma.classroom.delete({ where: { id } });
  }

  // ===== PERÍODOS =====

  async findAllPeriods() {
    return this.prisma.period.findMany({ orderBy: { startDate: 'desc' } });
  }
}