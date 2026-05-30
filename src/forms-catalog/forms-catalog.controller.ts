import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FormsCatalogService } from './forms-catalog.service';

interface RequestWithUser {
  user?: { role?: { slug?: string } };
}

@UseGuards(AuthGuard('jwt'))
@Controller('forms')
export class FormsCatalogController {
  constructor(private readonly catalog: FormsCatalogService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    const roleSlug = req.user?.role?.slug ?? 'member';
    return this.catalog.listForRole(roleSlug);
  }
}
