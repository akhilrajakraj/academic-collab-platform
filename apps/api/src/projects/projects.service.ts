import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { DemoIdentityService } from '../demo-identity/demo-identity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectSummary = {
  _count: { select: { documents: true, members: true } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: DemoIdentityService,
  ) {}

  async list() {
    const user = await this.identity.currentUser();
    return this.prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { updatedAt: 'desc' },
      include: projectSummary,
    });
  }

  async create(dto: CreateProjectDto) {
    const user = await this.identity.currentUser();
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      });
      await tx.projectMember.create({
        data: { projectId: project.id, userId: user.id, role: ProjectRole.OWNER },
      });
      await tx.activity.create({
        data: {
          projectId: project.id,
          actorId: user.id,
          type: 'PROJECT_CREATED',
          message: `Created project “${project.name}”`,
        },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: projectSummary,
      });
    });
  }

  async get(projectId: string) {
    const user = await this.identity.currentUser();
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, members: { some: { userId: user.id } } },
      include: projectSummary,
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    const user = await this.identity.currentUser();
    await this.requireOwner(projectId, user.id);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
      include: projectSummary,
    });
  }

  async remove(projectId: string) {
    const user = await this.identity.currentUser();
    await this.requireOwner(projectId, user.id);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async activity(projectId: string) {
    const user = await this.identity.currentUser();
    await this.requireMembership(projectId, user.id);
    return this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { actor: { select: { id: true, displayName: true } } },
    });
  }

  private async requireOwner(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Project not found.');
    if (membership.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only project owners can perform this action.');
    }
  }
}
