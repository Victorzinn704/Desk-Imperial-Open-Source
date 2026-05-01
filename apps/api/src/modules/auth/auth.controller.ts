import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { CurrentAuth } from './decorators/current-auth.decorator'
import type { AuthContext } from './auth.types'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from './auth-shared.util'
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { DemoLoginDto } from './dto/demo-login.dto'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { VerifyEmailDto } from './dto/verify-email.dto'
import { CsrfGuard } from './guards/csrf.guard'
import { SessionGuard } from './guards/session.guard'
import type { AuthService } from './auth.service'
import type { AuditLogService } from '../monitoring/audit-log.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto, @Req() request: Request) {
    return this.authService.register(body, extractRequestContext(request))
  }

  @Post('login')
  login(@Body() body: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(body, response, extractRequestContext(request))
  }

  @Post('demo')
  loginDemo(@Body() body: DemoLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.loginDemo(body, response, extractRequestContext(request))
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
  logout(@CurrentAuth() auth: AuthContext, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.logout(auth, response, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('me')
  getCurrentUser(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) response: Response) {
    return this.authService.getCurrentUser(auth, response)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('profile')
  updateProfile(@CurrentAuth() auth: AuthContext, @Body() body: UpdateProfileDto, @Req() request: Request) {
    return this.authService.updateProfile(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('activity')
  getActivity(@CurrentAuth() auth: AuthContext) {
    return this.auditLogService.getLastLoginsForUser(resolveAuthActorUserId(auth))
  }

  @UseGuards(SessionGuard)
  @Get('activity-feed')
  getActivityFeed(@CurrentAuth() auth: AuthContext) {
    return this.auditLogService.getActivityFeedForAuth(auth)
  }
}
