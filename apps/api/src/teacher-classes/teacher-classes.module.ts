import { Module } from '@nestjs/common';
import { TeacherClassesService } from './teacher-classes.service';
import { TeacherClassesController } from './teacher-classes.controller';

@Module({
  controllers: [TeacherClassesController],
  providers: [TeacherClassesService],
  exports: [TeacherClassesService],
})
export class TeacherClassesModule {}