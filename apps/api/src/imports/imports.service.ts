import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

const DAY_MAP: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5,
};

export const TEMPLATES: Record<string, { headers: string[]; example: string[] }> = {
  sedes: { headers: ['Nombre'], example: ['Sede Sur'] },
  classrooms: { headers: ['Nombre', 'Sede'], example: ['Aula B1', 'Sede Central'] },
  areas: { headers: ['Nombre'], example: ['Ciencias'] },
  courses: { headers: ['Nombre', 'Area'], example: ['Física', 'Ciencias'] },
  teachers: {
    headers: ['Nombres', 'Apellidos', 'DNI', 'Telefono', 'Email'],
    example: ['Juan', 'Pérez García', '12345678', '999999999', 'juan@mail.com'],
  },
  classes: {
    headers: ['DNI Docente', 'Curso', 'Sede', 'Salon', 'Dia', 'Hora', 'Bloque'],
    example: ['12345678', 'Álgebra', 'Sede Central', 'Salon 1', 'Lunes', '08:00-10:00', 'Bloque 1'],
  },
};

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  async generateTemplate(type: string): Promise<Buffer> {
    const tpl = TEMPLATES[type];
    if (!tpl) throw new BadRequestException('Tipo de plantilla no válido');

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Datos');
    ws.addRow(tpl.headers);
    ws.getRow(1).font = { bold: true };
    ws.addRow(tpl.example);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async parseRows(buffer: Buffer | ArrayBuffer): Promise<string[][]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const ws = workbook.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no tiene hojas');

    const rows: string[][] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // salta encabezados
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        values.push(String(cell.value ?? '').trim());
      });
      // salta filas totalmente vacías
      if (values.some((v) => v !== '')) rows.push(values);
    });
    return rows;
  }

  async importSedes(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const [name] = rows[i];
      if (!name) { result.errors.push({ row: i + 2, reason: 'Nombre vacío' }); continue; }
      const exists = await this.prisma.sede.findUnique({ where: { name } });
      if (exists) { result.skipped++; continue; }
      await this.prisma.sede.create({ data: { name } });
      result.created++;
    }
    return result;
  }

  async importClassrooms(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const [name, sedeName] = rows[i];
      const sede = await this.prisma.sede.findUnique({ where: { name: sedeName } });
      if (!sede) { result.errors.push({ row: i + 2, reason: `Sede no encontrada: ${sedeName}` }); continue; }
      const exists = await this.prisma.classroom.findFirst({ where: { name, sedeId: sede.id } });
      if (exists) { result.skipped++; continue; }
      await this.prisma.classroom.create({ data: { name, sedeId: sede.id } });
      result.created++;
    }
    return result;
  }

  async importAreas(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const [name] = rows[i];
      if (!name) { result.errors.push({ row: i + 2, reason: 'Nombre vacío' }); continue; }
      const exists = await this.prisma.area.findUnique({ where: { name } });
      if (exists) { result.skipped++; continue; }
      await this.prisma.area.create({ data: { name } });
      result.created++;
    }
    return result;
  }

  async importCourses(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const [name, areaName] = rows[i];
      const area = await this.prisma.area.findUnique({ where: { name: areaName } });
      if (!area) { result.errors.push({ row: i + 2, reason: `Área no encontrada: ${areaName}` }); continue; }
      const exists = await this.prisma.course.findFirst({ where: { name, areaId: area.id } });
      if (exists) { result.skipped++; continue; }
      await this.prisma.course.create({ data: { name, areaId: area.id } });
      result.created++;
    }
    return result;
  }

  async importTeachers(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const [firstName, lastName, dni, phone, email] = rows[i];
      if (!firstName || !lastName || !dni) {
        result.errors.push({ row: i + 2, reason: 'Nombres, Apellidos y DNI son obligatorios' });
        continue;
      }
      const exists = await this.prisma.teacher.findUnique({ where: { dni } });
      if (exists) { result.skipped++; continue; }
      await this.prisma.teacher.create({
        data: { firstName, lastName, dni, phone: phone || null, email: email || null },
      });
      result.created++;
    }
    return result;
  }

  async importClasses(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseRows(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    const period = await this.prisma.period.findFirst({ where: { isActive: true } });
    if (!period) throw new BadRequestException('No hay un período activo');

    for (let i = 0; i < rows.length; i++) {
      const [dni, courseName, sedeName, classroomName, dayStr, startTime, blockName] = rows[i];

      // ===== DOCENTE =====
      const teacher = await this.prisma.teacher.findUnique({ where: { dni } });
      if (!teacher) {
        result.errors.push({ row: i + 2, reason: `Docente no encontrado: ${dni}` });
        continue;
      }

      // ===== CURSO =====
      const course = await this.prisma.course.findFirst({ where: { name: courseName } });
      if (!course) {
        result.errors.push({ row: i + 2, reason: `Curso no encontrado: ${courseName}` });
        continue;
      }

      // ===== SEDE =====
      const sede = await this.prisma.sede.findUnique({ where: { name: sedeName } });
      if (!sede) {
        result.errors.push({ row: i + 2, reason: `Sede no encontrada: ${sedeName}` });
        continue;
      }

      // ===== SALÓN (opcional) =====
      let classroomId: string | null = null;
      if (classroomName) {
        const classroom = await this.prisma.classroom.findFirst({
          where: { name: classroomName, sedeId: sede.id },
        });
        if (!classroom) {
          result.errors.push({ row: i + 2, reason: `Salón no encontrado: ${classroomName}` });
          continue;
        }
        classroomId = classroom.id;
      }

      // ===== DÍA =====
      const day = DAY_MAP[dayStr?.toLowerCase()] || parseInt(dayStr);
      if (!day || day < 1 || day > 5) {
        result.errors.push({ row: i + 2, reason: `Día no válido: ${dayStr} (use Lunes-Viernes o 1-5)` });
        continue;
      }

      // ===== BLOQUE (opcional) =====
      // Si viene nombre → busca el bloque en el período activo
      // Si viene vacío → null = todo el período
      let blockId: string | null = null;
      if (blockName) {
        const block = await this.prisma.block.findFirst({
          where: { periodId: period.id, name: blockName },
        });
        if (!block) {
          result.errors.push({ row: i + 2, reason: `Bloque no encontrado: ${blockName}` });
          continue;
        }
        blockId = block.id;
      }

      // ===== DUPLICADO (incluye el bloque para permitir el mismo curso en otro bloque) =====
      const exists = await this.prisma.teacherClass.findFirst({
        where: {
          teacherId: teacher.id,
          courseId: course.id,
          sedeId: sede.id,
          dayOfWeek: day,
          periodId: period.id,
          classroomId: classroomId,
          blockId: blockId, // null compara contra null correctamente
        },
      });
      if (exists) {
        result.skipped++;
        continue;
      }

      // ===== CREAR =====
      await this.prisma.teacherClass.create({
        data: {
          teacherId: teacher.id,
          courseId: course.id,
          sedeId: sede.id,
          classroomId,
          periodId: period.id,
          dayOfWeek: day,
          hours: 3,
          startTime: startTime || null,
          blockId, // ← null = todo el período
        },
      });
      result.created++;
    }

    return result;
  }
}