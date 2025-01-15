import { Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { DriveModule } from '@/drive/drive.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [DriveModule, AuthModule],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
