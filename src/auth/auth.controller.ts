import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  SerializeOptions,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
  async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
    return this.authService.socialLogin(
      socialLoginDto.provider,
      socialLoginDto.idToken,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { user: User },
    @Body() logoutDto: LogoutDto,
  ) {
    return this.authService.logout(
      logoutDto.refreshToken,
      req.user.id,
      logoutDto.fcmToken,
    );
  }
}
