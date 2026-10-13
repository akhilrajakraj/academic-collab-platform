import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, ProjectRole } from '@prisma/client';
import { DemoIdentityService } from '../demo-identity/demo-identity.service';
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
    private readonly identity: DemoIdentityService,
  ) {}

  async listForProject(projectId: string) {
    const user = await this.identity.currentUser();
    await this.requireMembership(projectId, user.id);
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { revisions: true, comments: true } } },
    });
  }

  async createForProject(projectId: string, dto: CreateDocumentDto) {
    const user = await this.identity.currentUser();
    await this.requireEditor(projectId, user.id);
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
          actorId: user.id,
          type: 'DOCUMENT_CREATED',
          message: `Created document “${document.title}”`,
          metadata: { documentId: document.id },
        },
      });
      await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
      return document;
    });
  }

  async get(documentId: string) {
    const user = await this.identity.currentUser();
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: user.id } } },
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { revisions: true, comments: true } },
      },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  async update(documentId: string, dto: UpdateDocumentDto) {
    const user = await this.identity.currentUser();
    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: user.id } } },
      },
    });
    if (!existing) throw new NotFoundException('Document not found.');
    await this.requireEditor(existing.projectId, user.id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.content !== undefined) {
        await tx.documentRevision.create({
          data: {
            documentId: existing.id,
            authorId: user.id,
            title: existing.title,
            content: existing.content as Prisma.InputJsonValue,
          },
        });
      }
      const updated = await tx.document.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.content !== undefined ? { content: dto.content as Prisma.InputJsonValue } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
      await tx.activity.create({
        data: {
          projectId: existing.projectId,
          actorId: user.id,
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

  async remove(documentId: string) {
    const user = await this.identity.currentUser();
    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: user.id } } },
      },
      select: { id: true, projectId: true },
    });
    if (!existing) throw new NotFoundException('Document not found.');
    await this.requireEditor(existing.projectId, user.id);
    await this.prisma.document.delete({ where: { id: existing.id } });
    await this.prisma.project.update({
      where: { id: existing.projectId },
      data: { updatedAt: new Date() },
    });
  }

  async revisions(documentId: string) {
    const user = await this.identity.currentUser();
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        project: { members: { some: { userId: user.id } } },
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
    if (![ProjectRole.OWNER, ProjectRole.EDITOR].includes(role)) {
      throw new ForbiddenException('Your project role does not allow document changes.');
    }
  }
}
