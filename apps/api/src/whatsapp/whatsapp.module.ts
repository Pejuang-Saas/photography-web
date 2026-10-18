import { Module } from '@nestjs/common';
import { WahaModule } from '../waha/waha.module';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [WahaModule],
  controllers: [WhatsappController],
  providers: [WhatsappConnectionService],
})
export class WhatsappModule {}
