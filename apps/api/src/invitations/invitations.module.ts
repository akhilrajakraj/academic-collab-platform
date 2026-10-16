import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationsController, ProjectInvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProjectInvitationsController, InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
