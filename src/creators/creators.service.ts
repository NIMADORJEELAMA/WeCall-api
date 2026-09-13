// src/creators/creators.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatorStatus } from '@prisma/client';

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------------
  // EXPLORE CREATORS
  // -------------------------------------------------------------

  // Fetch all active creators for the Explore tab
  async getExploreCreators() {
    return this.prisma.creatorProfile.findMany({
      where: {
        status: CreatorStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  // -------------------------------------------------------------
  // GET CREATOR BY USER ID
  // -------------------------------------------------------------

  async getCreator(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found in database');
    }

    return creator;
  }

  // -------------------------------------------------------------
  // GET CREATOR BY USERNAME
  // -------------------------------------------------------------

  async getCreatorByUsername(username: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: {
        username: username.toLowerCase(),
      },
      select: {
        id: true,
        userId: true,
        username: true,
        bio: true,
        category: true,
        replyPrice: true,
        currency: true,
        profileImage: true,
        status: true,

        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Don't expose inactive creators through public links
    if (creator.status !== CreatorStatus.ACTIVE) {
      throw new NotFoundException('Creator not found');
    }

    return {
      id: creator.userId,
      name: creator.user.name,
      username: creator.username,
      bio: creator.bio,
      category: creator.category,
      replyPrice: creator.replyPrice,
      currency: creator.currency,
      profileImage: creator.profileImage,
      avatarUrl: creator.user.avatarUrl,
    };
  }
}
