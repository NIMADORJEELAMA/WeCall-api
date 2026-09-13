import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Get()
  getAll() {
    return this.usersService.findAll();
  }

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  updateToken(@Request() req, @Body('token') token: string) {
    // Use 'userId' instead of 'id' to match your JWT payload
    const userId = req.user.userId;

    console.log('Sending to service - ID:', userId, 'Token:', token);
    return this.usersService.updateFcmToken(userId, token);
  }
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only allow admins to delete
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
