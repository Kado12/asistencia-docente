import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TeachersModule } from './teachers/teachers.module';
import { AcademicModule } from './academic/academic.module';
import { TeacherClassesModule } from './teacher-classes/teacher-classes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    TeachersModule,
    AcademicModule,
    TeacherClassesModule,
  ],
})
export class AppModule {}