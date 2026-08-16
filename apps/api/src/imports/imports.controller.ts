import {
  Controller, Get, Post, Param, Res, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@control/database';

@ApiTags('Importaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('template/:type')
  @Roles(Role.ADMIN)
  async template(@Param('type') type: string, @Res() res: Response) {
    const buffer = await this.importsService.generateTemplate(type);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-${type}.xlsx"`,
    });
    res.send(buffer);
  }

  @Post(':type')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async importFile(
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No se proporcionó archivo');

    switch (type) {
      case 'sedes': return this.importsService.importSedes(file.buffer);
      case 'classrooms': return this.importsService.importClassrooms(file.buffer);
      case 'areas': return this.importsService.importAreas(file.buffer);
      case 'courses': return this.importsService.importCourses(file.buffer);
      case 'teachers': return this.importsService.importTeachers(file.buffer);
      case 'classes': return this.importsService.importClasses(file.buffer);
      default: throw new Error('Tipo de importación no válido');
    }
  }
}