import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceEntity } from '../ingestion/entities/data-source.entity.js';
import { IngestionRun } from '../ingestion/entities/ingestion-run.entity.js';
import { Axis } from './entities/axis.entity.js';
import { IndicatorValue } from './entities/indicator-value.entity.js';
import { Indicator } from './entities/indicator.entity.js';
import { Territory } from './entities/territory.entity.js';
import { IndicatorsController } from './indicators.controller.js';
import { IndicatorsService } from './indicators.service.js';

@Module({
  imports: [
    // Todas as entidades precisam estar registradas (autoLoadEntities), inclusive as
    // que só aparecem em relacionamentos (DataSourceEntity, IngestionRun).
    TypeOrmModule.forFeature([
      Axis,
      Indicator,
      Territory,
      IndicatorValue,
      DataSourceEntity,
      IngestionRun,
    ]),
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
})
export class IndicatorsModule {}
