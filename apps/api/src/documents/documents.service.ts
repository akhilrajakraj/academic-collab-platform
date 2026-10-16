import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const emptyDocument: Prisma.InputJsonValue = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async listForProject(projectId: string, userId: string) {
    await this.requireMembership(projectId, userId);
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { revisions: true, comments: true } } },
    });
  }

  async createForProject(projectId: string, dto: CreateDocumentDto, userId: string) {
    await this.requireEditor(projectId, userId);
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          projectId,
          title: dto.title.trim(),
          content: dto.content ? (dto.content as Prisma.InputJsonValue) : emptyDocument,
          status: DocumentStatus.DRAFT,
        },
      });
      await tx.activity.create({
        data: {
          projectId,
          actorId: userId,
          type: 'DOCUMENT_CREATED',
          message: `Created document “${document.title}”`,
          metadata: { documentId: document.id },
        },
      });
      await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
      return document;
    });
  }

  async get(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: userId } } },
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { revisions: true, comments: true } },
      },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  async update(documentId: string, dto: UpdateDocumentDto, userId: string) {
    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: userId } } },
      },
    });
    if (!existing) throw new NotFoundException('Document not found.');
    await this.requireEditor(existing.projectId, userId);

    if (dto.status !== undefined && dto.status !== existing.status) {
      const role = await this.requireMembership(existing.projectId, userId);
      const ownerOnlyTransition = dto.status === DocumentStatus.ARCHIVED
        || existing.status === DocumentStatus.ARCHIVED;
      if (ownerOnlyTransition && role !== ProjectRole.OWNER) {
        throw new ForbiddenException('Only the project owner can archive or reopen a document.');
      }

      const allowedTransitions: Record<DocumentStatus, DocumentStatus[]> = {
        [DocumentStatus.DRAFT]: [DocumentStatus.IN_REVIEW, DocumentStatus.ARCHIVED],
        [DocumentStatus.IN_REVIEW]: [DocumentStatus.DRAFT, DocumentStatus.APPROVED, DocumentStatus.ARCHIVED],
        [DocumentStatus.APPROVED]: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
        [DocumentStatus.ARCHIVED]: [DocumentStatus.DRAFT],
      };
      if (!allowedTransitions[existing.status].includes(dto.status)) {
        throw new BadRequestException(
          `Document status cannot move from ${existing.status} to ${dto.status}.`,
        );
      }
    }

    const expectedUpdatedAt = dto.expectedUpdatedAt
      ? new Date(dto.expectedUpdatedAt)
      : existing.updatedAt;

    if (expectedUpdatedAt.getTime() !== existing.updatedAt.getTime()) {
      throw new ConflictException({
        code: 'DOCUMENT_VERSION_CONFLICT',
        message: 'This document changed after you opened it. Reload the latest version before saving.',
        currentUpdatedAt: existing.updatedAt.toISOString(),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.content !== undefined) {
        await tx.documentRevision.create({
          data: {
            documentId: existing.id,
            authorId: userId,
            title: existing.title,
            content: existing.content as Prisma.InputJsonValue,
          },
        });
      }
      const write = await tx.document.updateMany({
        where: { id: existing.id, updatedAt: expectedUpdatedAt },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.content !== undefined ? { content: dto.content as Prisma.InputJsonValue } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
      if (write.count !== 1) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_CONFLICT',
          message: 'This document changed while you were saving. Reload the latest version before saving again.',
        });
      }
      const updated = await tx.document.findUniqueOrThrow({ where: { id: existing.id } });
      await tx.activity.create({
        data: {
          projectId: existing.projectId,
          actorId: userId,
          type: 'DOCUMENT_UPDATED',
          message: `Updated document “${updated.title}”`,
          metadata: { documentId: updated.id },
        },
      });
      await tx.project.update({
        where: { id: existing.projectId },
        data: { updatedAt: new Date() },
      });
      return updated;
    });
  }

  async remove(documentId: string, userId: string) {
    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: userId } } },
      },
      select: { id: true, projectId: true },
    });
    if (!existing) throw new NotFoundException('Document not found.');
    await this.requireEditor(existing.projectId, userId);
    await this.prisma.document.delete({ where: { id: existing.id } });
    await this.prisma.project.update({
      where: { id: existing.projectId },
      data: { updatedAt: new Date() },
    });
  }

  async revisions(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: userId } } },
      },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return this.prisma.documentRevision.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }


  async restoreRevision(
    documentId: string,
    revisionId: string,
    userId: string,
    expectedUpdatedAt?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, project: { members: { some: { userId: userId } } } },
    });
    if (!document) throw new NotFoundException('Document not found.');
    await this.requireEditor(document.projectId, userId);
    const revision = await this.prisma.documentRevision.findFirst({
      where: { id: revisionId, documentId },
    });
    if (!revision) throw new NotFoundException('Revision not found for this document.');

    const expected = expectedUpdatedAt ? new Date(expectedUpdatedAt) : document.updatedAt;
    if (expected.getTime() !== document.updatedAt.getTime()) {
      throw new ConflictException({
        code: 'DOCUMENT_VERSION_CONFLICT',
        message: 'This document changed after you opened it. Reload the latest version before restoring a revision.',
        currentUpdatedAt: document.updatedAt.toISOString(),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.documentRevision.create({
        data: {
          documentId,
          authorId: userId,
          title: document.title,
          content: document.content as Prisma.InputJsonValue,
        },
      });
      const write = await tx.document.updateMany({
        where: { id: documentId, updatedAt: expected },
        data: { title: revision.title, content: revision.content as Prisma.InputJsonValue },
      });
      if (write.count !== 1) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_CONFLICT',
          message: 'This document changed while the revision was being restored. Reload the latest version and try again.',
        });
      }
      const restored = await tx.document.findUniqueOrThrow({ where: { id: documentId } });
      await tx.activity.create({
        data: {
          projectId: document.projectId,
          actorId: userId,
          type: 'REVISION_RESTORED',
          message: `Restored an earlier version of “${restored.title}”`,
          metadata: { documentId, revisionId },
        },
      });
      await tx.project.update({
        where: { id: document.projectId },
        data: { updatedAt: new Date() },
      });
      return restored;
    });
  }

  private async requireMembership(projectId: string, userId: string): Promise<ProjectRole> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Project not found.');
    return membership.role;
  }

  private async requireEditor(projectId: string, userId: string): Promise<void> {
    const role = await this.requireMembership(projectId, userId);
    if (role !== ProjectRole.OWNER && role !== ProjectRole.EDITOR) {
      throw new ForbiddenException('Your project role does not allow document changes.');
    }
  }
}
