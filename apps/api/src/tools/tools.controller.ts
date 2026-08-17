import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Res } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
}