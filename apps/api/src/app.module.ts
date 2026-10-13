import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { DemoIdentityModule } from './demo-identity/demo-identity.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [PrismaModule, AuthModule, DemoIdentityModule, ProjectsModule, DocumentsModule, CommentsModule],
  controllers: [HealthController],
})
export class AppModule {}
