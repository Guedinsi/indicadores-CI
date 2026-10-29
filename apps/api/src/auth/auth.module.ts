import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { SupertokensService } from './supertokens.service.js';

@Module({
  controllers: [MeController],
  providers: [SupertokensService],
})
export class AuthModule {}
