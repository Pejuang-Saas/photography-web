import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/public.decorator';
import { CreateSessionDto, SaveSelectionDto } from './dto/gallery.dto';
import { SelectionsService } from './selections.service';

/** The customer's side. Reached by the secret token in the link; the global limit of 60 a minute applies. */
@Public()
@Controller('g')
export class PublicGalleriesController {
  constructor(private readonly selections: SelectionsService) {}

  @Get(':token')
  info(@Param('token') token: string) {
    return this.selections.info(token);
  }

  @Get(':token/photos')
  photos(
    @Param('token') token: string,
    @Query()
    query: {
      page?: string;
      limit?: string;
      folder?: string;
      filter?: string;
      type?: string;
      sessionToken?: string;
    },
  ) {
    return this.selections.photos(token, query);
  }

  @Post(':token/selections')
  create(@Param('token') token: string, @Body() dto: CreateSessionDto) {
    return this.selections.createSession(token, dto);
  }

  @Get(':token/selections/:sessionToken')
  resume(@Param('token') token: string, @Param('sessionToken') sessionToken: string) {
    return this.selections.getSession(token, sessionToken);
  }

  @Put(':token/selections/:sessionToken')
  save(
    @Param('token') token: string,
    @Param('sessionToken') sessionToken: string,
    @Body() dto: SaveSelectionDto,
  ) {
    return this.selections.save(token, sessionToken, dto.photoIds);
  }

  @Post(':token/selections/:sessionToken/submit')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Param('token') token: string, @Param('sessionToken') sessionToken: string) {
    return this.selections.submit(token, sessionToken);
  }
}
