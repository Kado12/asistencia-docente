import { Module } from '@nestjs/common';
import { ValidationsService } from './validations.service';
import { ValidationsController } from './validations.controller';

@Module({
  controllers: [ValidationsController],
  providers: [ValidationsService],
  exports: [ValidationsService],
})
export class ValidationsModule {}