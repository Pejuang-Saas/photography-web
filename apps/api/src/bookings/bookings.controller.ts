import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { Roles } from '@thallesp/nestjs-better-auth';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';
import { Public } from '../common/public.decorator';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Post('public/bookings')
  create(@Body() dto: CreateBookingDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.bookingsService.create(dto, idempotencyKey);
  }

  /** Which times are free on a date for a package; `extraMinutes` counts add-on time in. */
  @Public()
  @Get('public/availability')
  availability(
    @Query('date') date: string,
    @Query('packageId', ParseUUIDPipe) packageId: string,
    @Query('extraMinutes') extraMinutes?: string,
  ) {
    const extra = Math.min(Math.max(Math.trunc(Number(extraMinutes)) || 0, 0), 1440);
    return this.bookingsService.availability(date ?? '', packageId, extra);
  }

  @Public()
  @Get('public/bookings/:id/resume')
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.getResume(id);
  }

  @Public()
  @Get('public/bookings/:bookingCode')
  getPublic(@Param('bookingCode') bookingCode: string) {
    return this.bookingsService.getPublic(bookingCode);
  }

  @Roles(['admin'])
  @Get('admin/bookings')
  listAdmin(@Query('status') status?: BookingStatus) {
    return this.bookingsService.listAdmin(status);
  }

  @Roles(['admin'])
  @Get('admin/bookings/:id')
  getAdmin(@Param('id') id: string) {
    return this.bookingsService.getAdmin(id);
  }
}
