import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ProjectInvitationStatus, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

const invitationLifetimeDays = 7;
const assignableRoles = [ProjectRole.EDITOR, ProjectRole.REVIEWER, ProjectRole.VIEWER];

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(projectId: string, userId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Project not found.');
    return this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  }

  async listInvitations(projectId: string, userId: string) {
    await this.requireOwner(projectId, userId);
    const invitations = await this.prisma.projectInvitation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, role: true, status: true, expiresAt: true,
        acceptedAt: true, revokedAt: true, createdAt: true,
        invitedBy: { select: { id: true, displayName: true, email: true } },
      },
    });
    return invitations.map((invitation) => ({
      ...invitation,
      isExpired: invitation.status === ProjectInvitationStatus.PENDING
        && invitation.expiresAt.getTime() <= Date.now(),
    }));
  }

  async create(projectId: string, dto: CreateInvitationDto, userId: string) {
    await this.requireOwner(projectId, userId);
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? ProjectRole.EDITOR;
    if (!assignableRoles.includes(role)) {
      throw new ForbiddenException('Project owner role cannot be assigned through an invitation.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
        select: { id: true },
      });
      if (membership) throw new ConflictException('This user is already a project member.');
    }

    const pending = await this.prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email,
        status: ProjectInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (pending) throw new ConflictException('A pending invitation already exists for this email.');

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + invitationLifetimeDays * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.projectInvitation.create({
      data: {
        projectId,
        email,
        role,
        tokenHash: hashToken(token),
        invitedById: userId,
        expiresAt,
      },
      select: {
        id: true, projectId: true, email: true, role: true, status: true,
        expiresAt: true, createdAt: true,
      },
    });

    await this.prisma.activity.create({
      data: {
        projectId,
        actorId: userId,
        type: 'INVITATION_CREATED',
        message: `Invited ${email} to the project`,
        metadata: { invitationId: invitation.id, role },
      },
    });

    // The raw token is returned only at creation time; only its hash is persisted.
    return { ...invitation, acceptanceToken: token };
  }

  async accept(token: string, userId: string) {
    const tokenHash = hashToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists.');

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.projectInvitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.status !== ProjectInvitationStatus.PENDING) {
        throw new NotFoundException('Invitation not found or no longer available.');
      }
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new ConflictException('This invitation has expired.');
      }
      if (invitation.email !== user.email.toLowerCase()) {
        throw new ForbiddenException('Sign in with the email address this invitation was sent to.');
      }

      const existing = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId: invitation.projectId, userId } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('You are already a member of this project.');

      const membership = await tx.projectMember.create({
        data: { projectId: invitation.projectId, userId, role: invitation.role },
        include: { user: { select: { id: true, email: true, displayName: true } } },
      });
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: ProjectInvitationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      await tx.activity.create({
        data: {
          projectId: invitation.projectId,
          actorId: userId,
          type: 'INVITATION_ACCEPTED',
          message: `${user.displayName} joined the project`,
          metadata: { invitationId: invitation.id, role: invitation.role },
        },
      });
      return membership;
    });
  }

  async decline(token: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    const invitation = await this.prisma.projectInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!invitation || invitation.status !== ProjectInvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or no longer available.');
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('This invitation has expired.');
    }
    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException('Sign in with the email address this invitation was sent to.');
    }
    await this.prisma.projectInvitation.update({
      where: { id: invitation.id, status: ProjectInvitationStatus.PENDING },
      data: { status: ProjectInvitationStatus.DECLINED },
    });
    return { declined: true };
  }

  async revoke(projectId: string, invitationId: string, userId: string) {
    await this.requireOwner(projectId, userId);
    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
      select: { id: true, status: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.status !== ProjectInvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be revoked.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: ProjectInvitationStatus.REVOKED, revokedAt: new Date() },
      });
      await tx.activity.create({
        data: {
          projectId,
          actorId: userId,
          type: 'INVITATION_REVOKED',
          message: `Revoked an invitation to ${invitation.id}`,
          metadata: { invitationId: invitation.id },
        },
      });
    });
    return { revoked: true };
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    userId: string,
  ) {
    await this.requireOwner(projectId, userId);
    if (!assignableRoles.includes(dto.role)) {
      throw new ForbiddenException('The owner role cannot be assigned through member management.');
    }
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true, role: true },
    });
    if (!member) throw new NotFoundException('Project member not found.');
    if (member.role === ProjectRole.OWNER) {
      throw new ForbiddenException('The project owner role cannot be changed here.');
    }
    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  }

  async removeMember(projectId: string, memberId: string, userId: string) {
    await this.requireOwner(projectId, userId);
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true, userId: true, role: true, user: { select: { email: true, displayName: true } } },
    });
    if (!member) throw new NotFoundException('Project member not found.');
    if (member.role === ProjectRole.OWNER) {
      throw new ForbiddenException('The project owner cannot be removed.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({ where: { id: member.id } });
      await tx.activity.create({
        data: {
          projectId,
          actorId: userId,
          type: 'MEMBER_REMOVED',
          message: `Removed ${member.user.displayName} from the project`,
          metadata: { removedUserId: member.userId },
        },
      });
    });
    return { removed: true };
  }

  private async requireOwner(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Project not found.');
    if (membership.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only project owners can manage project invitations and members.');
    }
  }
}
