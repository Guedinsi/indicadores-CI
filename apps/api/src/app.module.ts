import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { IndicatorsModule } from './modules/indicators/indicators.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Rodando de apps/api o .env fica dois níveis acima; no Docker as variáveis vêm do ambiente.
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // o esquema só muda por migrations
      }),
    }),
    IndicatorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
