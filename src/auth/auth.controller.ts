import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Redirect,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Logger } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @Redirect()
  login() {
    const url = this.authService.getAuthUrl();
    return { url, statusCode: HttpStatus.FOUND };
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    if (!code) {
      throw new HttpException(
        'Authorization code not found.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const tokens = await this.authService.getTokens(code);
      Logger.log('Received tokens:', tokens);
      return {
        message: 'Authentication successful!',
        tokens,
      };
    } catch (error) {
      Logger.error('Auth callback error:', error);
      throw new HttpException(
        'Failed to exchange code for tokens.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
