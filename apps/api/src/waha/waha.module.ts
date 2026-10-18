import { Module } from '@nestjs/common';
import { WahaClient } from './waha.client';

@Module({ providers: [WahaClient], exports: [WahaClient] })
export class WahaModule {}
