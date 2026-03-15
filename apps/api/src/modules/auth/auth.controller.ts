import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { CurrentAuth } from './decorators/current-auth.decorator'
import type { AuthContext } from './auth.types'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { SessionGuard } from './guards/session.guard'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() body: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.register(body, response, extractRequestContext(request))
  }

  @Post('login')
  login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(body, response, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
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
  getCurrentUser(@CurrentAuth() auth: AuthContext) {
    return this.authService.getCurrentUser(auth)
  }
}
