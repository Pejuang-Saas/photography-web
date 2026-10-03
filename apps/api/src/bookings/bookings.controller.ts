import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { Roles } from '@thallesp/nestjs-better-auth';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('public/bookings')
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

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
