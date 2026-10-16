import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health.controller';
import { InvitationsModule } from './invitations/invitations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [PrismaModule, AuthModule, ProjectsModule, DocumentsModule, CommentsModule, InvitationsModule],
  controllers: [HealthController],
})
export class AppModule {}
