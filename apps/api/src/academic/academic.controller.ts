import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Académico')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ===== ÁREAS =====
  @Post('areas')
  @Roles(Role.ADMIN)
  createArea(@Body('name') name: string) {
    return this.academicService.createArea(name);
  }

  @Get('areas')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  findAllAreas() {
    return this.academicService.findAllAreas();
  }

  @Patch('areas/:id')
  @Roles(Role.ADMIN)
  updateArea(@Param('id') id: string, @Body('name') name: string) {
    return this.academicService.updateArea(id, name);
  }

  @Delete('areas/:id')
  @Roles(Role.ADMIN)
  deleteArea(@Param('id') id: string) {
    return this.academicService.deleteArea(id);
  }

  // ===== CURSOS =====
  @Post('courses')
  @Roles(Role.ADMIN)
  createCourse(@Body() body: { name: string; areaId: string }) {
    return this.academicService.createCourse(body.name, body.areaId);
  }

  @Patch('courses/:id')
  @Roles(Role.ADMIN)
  updateCourse(@Param('id') id: string, @Body() body: { name?: string; areaId?: string }) {
    return this.academicService.updateCourse(id, body);
  }

  @Delete('courses/:id')
  @Roles(Role.ADMIN)
  deleteCourse(@Param('id') id: string) {
    return this.academicService.deleteCourse(id);
  }

  // ===== SEDES =====
  @Post('sedes')
  @Roles(Role.ADMIN)
  createSede(@Body('name') name: string) {
    return this.academicService.createSede(name);
  }

  @Get('sedes')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  findAllSedes() {
    return this.academicService.findAllSedes();
  }

  @Patch('sedes/:id')
  @Roles(Role.ADMIN)
  updateSede(@Param('id') id: string, @Body('name') name: string) {
    return this.academicService.updateSede(id, name);
  }

  @Delete('sedes/:id')
  @Roles(Role.ADMIN)
  deleteSede(@Param('id') id: string) {
    return this.academicService.deleteSede(id);
  }

  // ===== SALONES =====
  @Post('classrooms')
  @Roles(Role.ADMIN)
  createClassroom(@Body() body: { name: string; sedeId: string }) {
    return this.academicService.createClassroom(body.name, body.sedeId);
  }

  @Patch('classrooms/:id')
  @Roles(Role.ADMIN)
  updateClassroom(@Param('id') id: string, @Body() body: { name?: string; sedeId?: string }) {
    return this.academicService.updateClassroom(id, body);
  }

  @Delete('classrooms/:id')
  @Roles(Role.ADMIN)
  deleteClassroom(@Param('id') id: string) {
    return this.academicService.deleteClassroom(id);
  }

  // ===== PERÍODOS =====
  @Get('periods')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  findAllPeriods() {
    return this.academicService.findAllPeriods();
  }
}