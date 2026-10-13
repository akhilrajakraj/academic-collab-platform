import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@Controller('projects/:projectId/documents')
export class ProjectDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.documents.listForProject(projectId);
  }

  @Post()
  create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documents.createForProject(projectId, dto);
  }
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':documentId')
  get(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.documents.get(documentId);
  }

  @Patch(':documentId')
  update(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documents.update(documentId, dto);
  }

  @Delete(':documentId')
  async remove(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    await this.documents.remove(documentId);
    return { deleted: true };
  }

  @Get(':documentId/revisions')
  revisions(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.documents.revisions(documentId);
  }
}
