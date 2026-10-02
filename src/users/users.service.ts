import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Basic creation (though you should primarily use AuthService.register)
  create(data: any) {
    return this.prisma.user.create({ data });
  }
  async updateProfile(userId: string, dto: UpdateUserDto) {
    const { password, creatorProfile, ...userData } = dto;

    const updateData: any = {
      ...userData,
    };

    // Hash password only when provided
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    try {
      // First check the user and their creator profile
      const existingUser = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          creatorProfile: true,
        },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Update User + CreatorProfile together
      const user = await this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          ...updateData,

          ...(creatorProfile &&
            existingUser.role === 'CREATOR' && {
              creatorProfile: existingUser.creatorProfile
                ? {
                    update: {
                      ...(creatorProfile.username !== undefined && {
                        username: creatorProfile.username,
                      }),

                      ...(creatorProfile.replyPrice !== undefined && {
                        replyPrice: creatorProfile.replyPrice,
                      }),
                    },
                  }
                : {
                    create: {
                      username:
                        creatorProfile.username ||
                        existingUser.name.toLowerCase().replace(/\s+/g, '') +
                          Math.floor(Math.random() * 10000),

                      replyPrice: creatorProfile.replyPrice ?? 5,
                    },
                  },
            }),
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,

          creatorProfile: {
            select: {
              id: true,
              username: true,
              replyPrice: true,
            },
          },
        },
      });

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw error;
    }
  }
  async update(id: string, dto: UpdateUserDto) {
    // 1. Create a clean data object
    const { password, ...otherData } = dto;
    const updateData: any = { ...otherData };

    // 2. Only handle password if it's a valid, non-empty string
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async deleteUser(id: string) {
    // 1. Fetch the user and count their related financial transactions
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true }, // We check payments instead of orders
        },
      },
    });

    // 2. Check if user exists
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 3. Check for financial history
    // You should NEVER delete a user who has processed payments (for tax/Stripe reasons)
    if (user._count.payments > 0) {
      throw new ConflictException(
        `Cannot delete user ${user.name} because they have existing payment history. Suspend the account instead.`,
      );
    }

    // 4. Safe to delete
    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      // 1. Add where clause if you ONLY want to show users who are creators
      // on the frontend explore page (Optional, but recommended)
      where: {
        role: 'CREATOR',
        status: 'ACTIVE', // Only show active creators
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        creatorProfile: true, // <-- CRITICAL: Include the creator profile data (prices, category)
      },
    });
  }
  async updateFcmToken(userId: string, token: string) {
    // try {
    //   return await this.prisma.user.update({
    //     where: { id: userId },
    //     data: { fcmToken: token },
    //   });
    // } catch (error) {
    //   throw new NotFoundException(`User with ID ${userId} not found`);
    // }
  }

  async findOne(id: string) {
    // Rewritten to fetch creator data and messaging stats instead of staff/salary data
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        creatorProfile: true, // Bring in creator details if they are a creator
        _count: {
          select: {
            sentMessages: true,
            receivedMessages: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Exclude password before returning the payload
    const { password, ...safeUser } = user;

    return {
      ...safeUser,
      stats: {
        messagesSent: user._count.sentMessages,
        messagesReceived: user._count.receivedMessages,
        totalPayments: user._count.payments,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,

        creatorProfile: {
          select: {
            id: true,
            username: true,
            replyPrice: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }
}
