import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentsController, DocumentCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentCommentsController, CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
