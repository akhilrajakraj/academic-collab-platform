import { Module } from '@nestjs/common';
import { CommentsController, DocumentCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [DocumentCommentsController, CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
