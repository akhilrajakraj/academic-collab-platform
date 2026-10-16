import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ProjectRole } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type Collaborator = {
  userId: string;
  displayName: string;
  role: ProjectRole;
};

type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
    email?: string;
    collaborator?: Collaborator;
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token.trim()) {
        next(new Error('A valid access token is required.'));
        return;
      }
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
        if (!payload.sub || !payload.email) throw new Error('Missing token claims');
        socket.data.userId = payload.sub;
        socket.data.email = payload.email;
        next();
      } catch {
        next(new Error('The access token is invalid or expired.'));
      }
    });
  }

  handleConnection(_client: AuthenticatedSocket): void {
    // Namespace middleware authenticates the socket before the connection is accepted.
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const collaborator = client.data.collaborator;
    if (!collaborator) return;

    for (const room of client.rooms) {
      if (!room.startsWith('document:')) continue;
      await this.broadcastPresence(room);
    }
  }

  @SubscribeMessage('join-document')
  async joinDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { documentId?: unknown },
  ): Promise<{ ok: boolean; documentId?: string; message?: string }> {
    if (!client.data.userId) {
      return { ok: false, message: 'Socket authentication is required.' };
    }
    if (typeof body?.documentId !== 'string' || !UUID_PATTERN.test(body.documentId)) {
      return { ok: false, message: 'A valid document ID is required.' };
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: body.documentId,
        project: { members: { some: { userId: client.data.userId } } },
      },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            members: {
              where: { userId: client.data.userId },
              select: { role: true, user: { select: { displayName: true } } },
              take: 1,
            },
          },
        },
      },
    });

    const membership = document?.project.members[0];
    if (!document || !membership) {
      return { ok: false, message: 'Document not found or access denied.' };
    }

    const collaborator: Collaborator = {
      userId: client.data.userId,
      displayName: membership.user.displayName,
      role: membership.role,
    };
    client.data.collaborator = collaborator;

    // A socket may only enter a room after server-side project membership validation.
    await client.join(this.roomFor(document.id));
    client.emit('document-joined', {
      documentId: document.id,
      projectId: document.projectId,
      collaborator,
      canEdit: membership.role === ProjectRole.OWNER || membership.role === ProjectRole.EDITOR,
    });
    await this.broadcastPresence(this.roomFor(document.id));
    return { ok: true, documentId: document.id };
  }

  @SubscribeMessage('leave-document')
  async leaveDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { documentId?: unknown },
  ): Promise<{ ok: boolean }> {
    if (typeof body?.documentId !== 'string' || !UUID_PATTERN.test(body.documentId)) {
      return { ok: false };
    }
    const room = this.roomFor(body.documentId);
    await client.leave(room);
    await this.broadcastPresence(room);
    return { ok: true };
  }

  private roomFor(documentId: string): string {
    return `document:${documentId}`;
  }

  private async broadcastPresence(room: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(room).fetchSockets();
    const byUser = new Map<string, Collaborator>();
    for (const socket of sockets) {
      const collaborator = socket.data.collaborator as Collaborator | undefined;
      if (collaborator) byUser.set(collaborator.userId, collaborator);
    }
    this.server.to(room).emit('presence-updated', Array.from(byUser.values()));
  }
}
