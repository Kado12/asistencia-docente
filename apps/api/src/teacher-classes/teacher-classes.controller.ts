import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherClassesService } from './teacher-classes.service';
import { CreateTeacherClassDto, UpdateTeacherClassDto } from './dto/teacher-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Clases Asignadas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher-classes')
export class TeacherClassesController {
  constructor(private readonly service: TeacherClassesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTeacherClassDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COORDINADOR)
  findAll(
    @Query('teacherId') teacherId?: string,
    @Query('sedeId') sedeId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.service.findAll({
      teacherId,
      sedeId,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : undefined,
      periodId,
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTeacherClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}