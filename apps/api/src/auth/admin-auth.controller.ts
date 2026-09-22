import { Controller, Get } from '@nestjs/common';
import { Roles, Session, UserSession } from '@thallesp/nestjs-better-auth';

@Roles(['admin'])
@Controller('admin/auth')
export class AdminAuthController {
  @Get('me')
  getMe(@Session() session: UserSession) {
    return { user: session.user };
  }
}
