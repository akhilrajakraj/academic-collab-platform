import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/documents')
export class ProjectDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    return this.documents.listForProject(projectId, userId);
  }

  @Post()
  create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.documents.createForProject(projectId, dto, userId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':documentId')
  get(@Param('documentId', new ParseUUIDPipe()) documentId: string, @CurrentUserId() userId: string) {
    return this.documents.get(documentId, userId);
  }

  @Patch(':documentId')
  update(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.documents.update(documentId, dto, userId);
  }

  @Delete(':documentId')
  async remove(@Param('documentId', new ParseUUIDPipe()) documentId: string, @CurrentUserId() userId: string) {
    await this.documents.remove(documentId, userId);
    return { deleted: true };
  }

  @Get(':documentId/revisions')
  revisions(@Param('documentId', new ParseUUIDPipe()) documentId: string, @CurrentUserId() userId: string) {
    return this.documents.revisions(documentId, userId);
  }

  @Post(':documentId/revisions/:revisionId/restore')
  restoreRevision(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Param('revisionId', new ParseUUIDPipe()) revisionId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.documents.restoreRevision(documentId, revisionId, userId);
  }
}
