import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemoIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async currentUser(): Promise<User> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Demo identity is disabled in production. Configure authentication before enabling project APIs.',
      );
    }

    const email = process.env.DEMO_USER_EMAIL ?? 'demo@academic-collab.local';
    const displayName = process.env.DEMO_USER_NAME ?? 'Demo Student';

    return this.prisma.user.upsert({
      where: { email },
      update: { displayName },
      create: { email, displayName },
    });
  }
}
