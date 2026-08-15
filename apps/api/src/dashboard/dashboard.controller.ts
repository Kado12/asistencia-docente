import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Resumen general (totales, por sede, validaciones)' })
  getSummary(
    @Query('periodId') periodId: string,
    @Query('weekNumber') weekNumber?: string,
  ) {
    return this.dashboardService.getSummary(
      periodId,
      weekNumber ? parseInt(weekNumber) : undefined,
    );
  }
}