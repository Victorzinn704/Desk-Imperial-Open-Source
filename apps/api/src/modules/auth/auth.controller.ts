import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { CurrentAuth } from './decorators/current-auth.decorator'
import type { AuthContext } from './auth.types'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { CsrfGuard } from './guards/csrf.guard'
import { SessionGuard } from './guards/session.guard'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto, @Req() request: Request) {
    return this.authService.register(body, extractRequestContext(request))
  }

  @Post('login')
  login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(body, response, extractRequestContext(request))
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.requestPasswordReset(body, extractRequestContext(request))
  }

  @Post('verify-email/request')
  requestEmailVerification(@Body() body: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.requestEmailVerification(body, extractRequestContext(request))
  }

  @Post('verify-email/confirm')
  verifyEmail(@Body() body: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyEmail(body, extractRequestContext(request))
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() request: Request) {
    return this.authService.resetPassword(body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('logout')
  logout(
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(auth, response, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('me')
  getCurrentUser(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) response: Response) {
    return this.authService.getCurrentUser(auth, response)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('profile')
  updateProfile(
    @CurrentAuth() auth: AuthContext,
    @Body() body: UpdateProfileDto,
    @Req() request: Request,
  ) {
    return this.authService.updateProfile(auth, body, extractRequestContext(request))
  }
}
