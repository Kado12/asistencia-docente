import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { SaveDailyAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Asistencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('daily')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Clases del día con asistencia registrada' })
  getDaily(@Query('date') date: string, @Query('sedeId') sedeId?: string) {
    return this.attendanceService.getDaily(date, sedeId);
  }

  @Post('daily')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Guardar asistencia del día (masivo)' })
  saveDaily(@Body() dto: SaveDailyAttendanceDto) {
    return this.attendanceService.saveDaily(dto);
  }

  @Get('weekly')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Vista semanal de un docente (como Excel)' })
  getWeekly(
    @Query('teacherId') teacherId: string,
    @Query('periodId') periodId: string,
    @Query('weekNumber') weekNumber: string,
  ) {
    return this.attendanceService.getWeekly(
      teacherId,
      periodId,
      weekNumber ? parseInt(weekNumber) : 1,
    );
  }
}