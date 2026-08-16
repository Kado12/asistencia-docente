import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService, GroupBy, ReportMode } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseParams(query: any) {
    return {
      periodId: query.periodId,
      mode: (query.mode || 'week') as ReportMode,
      weekNumber: query.weekNumber ? parseInt(query.weekNumber) : undefined,
      month: query.month,
      groupBy: (query.groupBy || 'teacher') as GroupBy,
      sedeId: query.sedeId,
      areaId: query.areaId,
      courseId: query.courseId,
      teacherId: query.teacherId,
      blockId: query.blockId,
    };
  }

  @Get('consolidated')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Consolidado agrupado con filtros' })
  getConsolidated(@Query() query: any) {
    return this.reportsService.getConsolidated(this.parseParams(query));
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @ApiOperation({ summary: 'Exportar consolidado a Excel' })
  async exportExcel(@Query() query: any, @Res() res: Response) {
    const params = this.parseParams(query);
    const buffer = await this.reportsService.exportExcel(params);

    const modeSuffix =
      params.mode === 'week' ? `S${params.weekNumber}` : params.mode === 'month' ? params.month : 'periodo';

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="consolidado-${params.groupBy}-${modeSuffix}.xlsx"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }
}