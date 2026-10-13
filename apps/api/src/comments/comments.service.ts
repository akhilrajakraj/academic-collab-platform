import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async list(documentId: string, userId: string) {
    await this.requireDocument(documentId, userId);
    return this.prisma.comment.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async create(documentId: string, dto: CreateCommentDto, userId: string) {
    const document = await this.requireDocument(documentId, userId);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          documentId,
          authorId: userId,
          body: dto.body.trim(),
          ...(dto.anchor ? { anchor: dto.anchor } : {}),
        },
        include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      await tx.activity.create({
        data: {
          projectId: document.projectId,
          actorId: userId,
          type: 'COMMENT_ADDED',
          message: `Commented on “${document.title}”`,
          metadata: { documentId, commentId: comment.id },
        },
      });
      return comment;
    });
  }

  async setResolved(commentId: string, resolved: boolean, userId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, document: { project: { members: { some: { userId: userId } } } } },
      include: { document: { select: { projectId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found.');
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: comment.document.projectId, userId: userId } },
      select: { role: true },
    });
    if (!membership || membership.role === ProjectRole.VIEWER) {
      throw new ForbiddenException('Your project role cannot resolve comments.');
    }
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { resolvedAt: resolved ? new Date() : null },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, document: { project: { members: { some: { userId: userId } } } } },
      include: { document: { select: { projectId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found.');
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: comment.document.projectId, userId: userId } },
      select: { role: true },
    });
    if (comment.authorId !== userId && membership?.role !== ProjectRole.OWNER && membership?.role !== ProjectRole.EDITOR) {
      throw new ForbiddenException('You can only delete your own comments.');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  private async requireDocument(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, project: { members: { some: { userId } } } },
      select: { id: true, title: true, projectId: true },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }
}
