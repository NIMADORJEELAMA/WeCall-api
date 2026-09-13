export class UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'FRONT_OFFICE';
  isActive?: boolean; // Add this
  dailyRate?: GLfloat;
}
