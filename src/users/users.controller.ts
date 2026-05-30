import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  SerializeOptions,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly deviceTokensService: UserDeviceTokensService,
    private readonly preferencesService: UserNotificationPreferencesService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Device tokens — must be before /:id routes
  @Post('device-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerDeviceToken(
    @Request() req: { user: { id: number } },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.deviceTokensService.register(req.user.id, dto);
  }

  @Delete('device-tokens/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDeviceToken(
    @Request() req: { user: { id: number } },
    @Param('token') token: string,
  ) {
    return this.deviceTokensService.remove(req.user.id, token);
  }

  // Notification preferences — must be before /:id routes
  @Get('me/notification-preferences')
  async getNotificationPreferences(@Request() req: { user: { id: number } }) {
    const prefs = await this.preferencesService.getOrCreate(req.user.id);
    return this.preferencesService.toResponse(prefs);
  }

  @Put('me/notification-preferences')
  async updateNotificationPreferences(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const prefs = await this.preferencesService.update(req.user.id, dto);
    return this.preferencesService.toResponse(prefs);
  }

  // Self-profile endpoints — MUST be before /:id routes
  @Get('me')
  async getMe(@Request() req: { user: { id: number } }) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('me')
  async updateMe(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('lookup')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader')
  lookupForForms(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    return this.usersService.lookupForForms({ email, phone });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  // Admin-only: update a single user's role
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(+id, updateUserRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
