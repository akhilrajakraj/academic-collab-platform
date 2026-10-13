import { Module } from '@nestjs/common';
import { ProjectDocumentsController, DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [ProjectDocumentsController, DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
