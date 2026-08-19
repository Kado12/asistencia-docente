import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Res, UploadedFile } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Herramientas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  private extractBuffers(files: any): { bufferA: Buffer; bufferB: Buffer } {
    const fileA = files?.fileA?.[0];
    const fileB = files?.fileB?.[0];
    if (!fileA || !fileB) {
      throw new BadRequestException('Debes subir ambos archivos Excel');
    }
    return { bufferA: fileA.buffer, bufferB: fileB.buffer };
  }

  @Post('compare')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fileA', maxCount: 1 }, { name: 'fileB', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  compare(@UploadedFiles() files: any) {
    const { bufferA, bufferB } = this.extractBuffers(files);
    return this.toolsService.compareExcel(bufferA, bufferB);
  }

  @Post('compare/export')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fileA', maxCount: 1 }, { name: 'fileB', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  async compareExport(@UploadedFiles() files: any, @Res() res: Response) {
    const { bufferA, bufferB } = this.extractBuffers(files);
    const buffer = await this.toolsService.compareExportExcel(bufferA, bufferB);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="comparativa_alumnos.xlsx"',
    });
    res.send(buffer);
  }

    @Post('schedule/transform')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  transformSchedule(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Debes subir el archivo de horario');
    return this.toolsService.transformSchedule(file.buffer);
  }

  @Post('schedule/transform/export')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async transformScheduleExport(@UploadedFile() file: any, @Res() res: Response) {
    if (!file) throw new BadRequestException('Debes subir el archivo de horario');
    const buffer = await this.toolsService.transformScheduleExport(file.buffer);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="horario_ordenado.xlsx"',
    });
    res.send(buffer);
  }

  @Post('cross')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fileInfo', maxCount: 1 }, { name: 'fileSchedule', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  crossReference(@UploadedFiles() files: any) {
    const info = files?.fileInfo?.[0];
    const schedule = files?.fileSchedule?.[0];
    if (!info || !schedule) throw new BadRequestException('Debes subir ambos archivos');
    return this.toolsService.crossReference(info.buffer, schedule.buffer);
  }

  @Post('cross/export')
  @Roles(Role.ADMIN, Role.COORDINADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fileInfo', maxCount: 1 }, { name: 'fileSchedule', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  async crossReferenceExport(@UploadedFiles() files: any, @Res() res: Response) {
    const info = files?.fileInfo?.[0];
    const schedule = files?.fileSchedule?.[0];
    if (!info || !schedule) throw new BadRequestException('Debes subir ambos archivos');

    const buffer = await this.toolsService.crossReferenceExport(info.buffer, schedule.buffer);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="horario_con_dni.xlsx"',
    });
    res.send(buffer);
  }
}