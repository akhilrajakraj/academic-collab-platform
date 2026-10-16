import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { InvitationTokenDto } from './dto/invitation-token.dto';
import { InvitationsService } from './invitations.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId')
export class ProjectInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get('members')
  members(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    return this.invitations.listMembers(projectId, userId);
  }

  @Get('invitations')
  list(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    return this.invitations.listInvitations(projectId, userId);
  }

  @Post('invitations')
  create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.create(projectId, dto, userId);
  }

  @Delete('invitations/:invitationId')
  revoke(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.revoke(projectId, invitationId, userId);
  }

  @Patch('members/:memberId/role')
  updateRole(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.updateMemberRole(projectId, memberId, dto, userId);
  }

  @Delete('members/:memberId')
  removeMember(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.removeMember(projectId, memberId, userId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('accept')
  accept(@Body() dto: InvitationTokenDto, @CurrentUserId() userId: string) {
    return this.invitations.accept(dto.token, userId);
  }

  @Post('decline')
  decline(@Body() dto: InvitationTokenDto, @CurrentUserId() userId: string) {
    return this.invitations.decline(dto.token, userId);
  }
}
