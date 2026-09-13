// src/creators/creators.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatorStatus } from '@prisma/client';

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

  // Fetch all active creators for the Explore tab
  async getExploreCreators() {
    return this.prisma.creatorProfile.findMany({
      where: { status: CreatorStatus.ACTIVE },
      include: {
        user: { select: { name: true } },
      },
    });
  }

  // src/creators/creators.service.ts
  async getCreator(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      // We search by userId because the URL parameter is the User's ID
      where: { userId: userId },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });

    if (!creator) throw new NotFoundException('Creator not found in database');

    return creator;
  }
}
