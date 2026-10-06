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
import { UserStatus, UserRole, OtpPurpose } from '@prisma/client';
import { access } from 'fs';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    console.log('🔥 LOGIN USER:', user);
    if (!user) {
      throw new UnauthorizedException('Email address not recognized');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    // Google account
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google login. Please continue with Google.',
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    // Remove previous OTPs
    await this.prisma.emailOtp.deleteMany({
      where: {
        email: user.email,
      },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('otp login', otp);

    // Hash OTP
    const codeHash = await bcrypt.hash(otp, 10);

    // 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.emailOtp.create({
      data: {
        email: user.email,
        codeHash,
        expiresAt,
      },
    });

    await this.emailService.sendLoginOtp(user.email, otp);

    return {
      requiresOtp: true,
      email: user.email,
    };
  }

  async verifyLoginOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification request');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    const otpRecord = await this.prisma.emailOtp.findFirst({
      where: {
        email: user.email,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Verification code expired or not found');
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.prisma.emailOtp.delete({
        where: {
          id: otpRecord.id,
        },
      });

      throw new UnauthorizedException('Verification code has expired');
    }

    if (otpRecord.attempts >= 5) {
      await this.prisma.emailOtp.delete({
        where: {
          id: otpRecord.id,
        },
      });

      throw new UnauthorizedException(
        'Too many verification attempts. Please log in again.',
      );
    }

    const isValid = await bcrypt.compare(otp, otpRecord.codeHash);

    if (!isValid) {
      await this.prisma.emailOtp.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Incorrect verification code');
    }

    // OTP can never be reused
    await this.prisma.emailOtp.delete({
      where: {
        id: otpRecord.id,
      },
    });

    // NOW create JWT
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
      },
    };
  }
  async verifySignupOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose: OtpPurpose.SIGNUP,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Verification code not found');
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.prisma.emailOtp.delete({
        where: { id: otpRecord.id },
      });

      throw new UnauthorizedException('Verification code has expired');
    }

    if (otpRecord.attempts >= 5) {
      await this.prisma.emailOtp.delete({
        where: { id: otpRecord.id },
      });

      throw new UnauthorizedException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    const isValid = await bcrypt.compare(otp, otpRecord.codeHash);

    if (!isValid) {
      await this.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Invalid verification code');
    }
    await this.prisma.user.update({
      where: {
        email: normalizedEmail,
      },
      data: {
        emailVerified: true,
      },
    });
    await this.prisma.emailOtp.delete({
      where: { id: otpRecord.id },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    // const payload = {
    //   sub: user.id,
    //   role: user.role,
    //   email: user.email,
    //   name: user.name,
    // };

    // const access_token = this.jwtService.sign(payload);

    return {
      success: true,
      email: normalizedEmail,
      // access_token,
      // user: {
      //   id: user.id,
      //   name: user.name,
      //   email: user.email,
      //   role: user.role,
      //   status: user.status,
      // },
    };
  }

  // async login(email: string, password: string) {
  //   const user = await this.prisma.user.findUnique({
  //     where: { email },
  //   });

  //   console.log('🔥 LOGIN USER:', user);

  //   if (!user) {
  //     throw new UnauthorizedException('Email address not recognized');
  //   }

  //   if (user.status === UserStatus.SUSPENDED) {
  //     throw new ForbiddenException('Account is suspended');
  //   }

  //   // Google/OAuth account
  //   if (!user.password) {
  //     throw new UnauthorizedException(
  //       'This account uses Google login. Please continue with Google.',
  //     );
  //   }

  //   const isValid = await bcrypt.compare(password, user.password);

  //   if (!isValid) {
  //     throw new UnauthorizedException('Incorrect password');
  //   }

  //   const payload = {
  //     sub: user.id,
  //     role: user.role,
  //     email: user.email,
  //     name: user.name,
  //   };

  //   const access_token = this.jwtService.sign(payload);

  //   return {
  //     access_token,
  //     user: {
  //       id: user.id,
  //       name: user.name,
  //       email: user.email,
  //       role: user.role,
  //       status: user.status,
  //     },
  //   };
  // }
  // async login(email: string, password: string) {
  //   const user = await this.prisma.user.findUnique({
  //     where: { email },
  //   });

  //   if (!user) {
  //     throw new UnauthorizedException('Email address not recognized');
  //   }

  //   // Match the new 'status' field and 'UserStatus.SUSPENDED' enum
  //   if (user.status === UserStatus.SUSPENDED) {
  //     throw new ForbiddenException('Account is suspended');
  //   }

  //   const isValid = await bcrypt.compare(password, user.password);
  //   if (!isValid) {
  //     throw new UnauthorizedException('Incorrect password');
  //   }

  //   const payload = {
  //     sub: user.id,
  //     role: user.role,
  //     email: user.email,
  //     name: user.name,
  //   };

  //   return {
  //     access_token: this.jwtService.sign(payload),
  //     user: {
  //       id: user.id,
  //       name: user.name,
  //       email: user.email,
  //       role: user.role,
  //       status: user.status, // Optional: useful for the frontend to know
  //       access_token: this.jwtService.sign(payload), // Optional: include the token in the user object
  //     },
  //   };
  // }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
      },
    });

    // Remove any previous signup OTP
    await this.prisma.emailOtp.deleteMany({
      where: {
        email,
        purpose: OtpPurpose.SIGNUP,
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('otp', otp);

    const codeHash = await bcrypt.hash(otp, 10);

    await this.prisma.emailOtp.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.SIGNUP,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      },
    });

    await this.emailService.sendLoginOtp(email, otp);

    return {
      requiresOtp: true,
      email,
    };
  }
  // async register(dto: RegisterDto) {
  //   // 1. Check if user already exists
  //   const existingUser = await this.prisma.user.findUnique({
  //     where: { email: dto.email },
  //   });

  //   if (existingUser) {
  //     throw new ConflictException(`Email ${dto.email} is already registered`);
  //   }

  //   // 2. Hash password
  //   const hashed = await bcrypt.hash(dto.password, 10);

  //   // Generate a default username (e.g., "lisa1234") if they are a creator
  //   const defaultUsername =
  //     dto.name.toLowerCase().replace(/\s+/g, '') +
  //     Math.floor(Math.random() * 10000);

  //   // 3. Create user and conditionally create CreatorProfile
  //   return this.prisma.user.create({
  //     data: {
  //       name: dto.name,
  //       email: dto.email,
  //       password: hashed,
  //       role: dto.role,

  //       // If the role is CREATOR, automatically initialize their profile
  //       ...(dto.role === 'CREATOR' && {
  //         creatorProfile: {
  //           create: {
  //             replyPrice: 5.0, // Default price
  //             username: defaultUsername, // <-- ADDED THIS TO FIX THE ERROR
  //           },
  //         },
  //       }),
  //     },
  //     // Safely select fields to return, explicitly excluding the password
  //     select: {
  //       id: true,
  //       name: true,
  //       email: true,
  //       role: true,
  //       status: true,
  //       creatorProfile: true, // Return this so you can verify it was created
  //     },
  //   });
  // }
  async validateGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const existingAccount = await (this.prisma as any).authAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: data.googleId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAccount) {
      if (existingAccount.user.status === UserStatus.SUSPENDED) {
        throw new ForbiddenException('Account is suspended');
      }

      return existingAccount.user;
    }

    // Check whether the email already belongs to an account
    let user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new ForbiddenException('Account is suspended');
      }

      // Link Google to existing account
      await (this.prisma as any).authAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: data.googleId,
        },
      });

      return user;
    }

    // Create completely new user
    user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: null,
        avatarUrl: data.avatarUrl,
        role: UserRole.USER,

        authAccounts: {
          create: {
            provider: 'GOOGLE',
            providerAccountId: data.googleId,
          },
        },
      },
    });

    return user;
  }

  async loginWithGoogle(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const user = await this.validateGoogleUser(data);

    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
