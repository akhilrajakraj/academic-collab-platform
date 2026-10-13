import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectDocumentsController, DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectDocumentsController, DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
