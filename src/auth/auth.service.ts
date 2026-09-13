import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

// Ensure you import UserStatus and UserRole from your Prisma client
import { UserStatus, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email address not recognized');
    }

    // Match the new 'status' field and 'UserStatus.SUSPENDED' enum
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status, // Optional: useful for the frontend to know
      },
    };
  }

  async register(dto: RegisterDto) {
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    // 2. Hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // Generate a default username (e.g., "lisa1234") if they are a creator
    const defaultUsername =
      dto.name.toLowerCase().replace(/\s+/g, '') +
      Math.floor(Math.random() * 10000);

    // 3. Create user and conditionally create CreatorProfile
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,

        // If the role is CREATOR, automatically initialize their profile
        ...(dto.role === 'CREATOR' && {
          creatorProfile: {
            create: {
              replyPrice: 5.0, // Default price
              username: defaultUsername, // <-- ADDED THIS TO FIX THE ERROR
            },
          },
        }),
      },
      // Safely select fields to return, explicitly excluding the password
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        creatorProfile: true, // Return this so you can verify it was created
      },
    });
  }
}
