import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ValidationsService } from './validations.service';
import { SetValidationDto } from './dto/set-validation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Validaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('validations')
export class ValidationsController {
  constructor(private readonly validationsService: ValidationsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Estado de validación de la semana por docente' })
  getWeekStatus(
    @Query('periodId') periodId: string,
    @Query('weekNumber') weekNumber: string,
  ) {
    return this.validationsService.getWeekStatus(
      periodId,
      weekNumber ? parseInt(weekNumber) : 1,
    );
  }

  @Post()
  @Roles(Role.COORDINADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Validar u observar la semana de un docente' })
  setStatus(@Body() dto: SetValidationDto, @Request() req) {
    return this.validationsService.setStatus(dto, req.user.id);
  }
}