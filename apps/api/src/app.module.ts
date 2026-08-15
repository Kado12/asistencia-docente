import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TeachersModule } from './teachers/teachers.module';
import { AcademicModule } from './academic/academic.module';
import { TeacherClassesModule } from './teacher-classes/teacher-classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ReportsModule } from './reports/reports.module';
import { ValidationsModule } from './validations/validations.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    TeachersModule,
    AcademicModule,
    TeacherClassesModule,
    AttendanceModule,
    ReportsModule,
    ValidationsModule,
    DashboardModule,
  ],
})
export class AppModule {}