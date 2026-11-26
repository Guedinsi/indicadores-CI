import { Controller, Get, Param, Query } from '@nestjs/common';
import { IndicatorsService } from './indicators.service.js';

@Controller()
export class IndicatorsController {
  constructor(private readonly service: IndicatorsService) {}

  @Get('axes')
  axes() {
    return this.service.listAxes();
  }

  @Get('periods')
  periods() {
    return this.service.listPeriods();
  }

  @Get('indicators/latest')
  latest(@Query('axis') axis?: string, @Query('period') period?: string) {
    return this.service.latest(axis, period);
  }

  @Get('indicators/:code/values')
  series(@Param('code') code: string, @Query('territory') territory?: string) {
    return this.service.series(code, territory);
  }

  @Get('indicators/:code/comparison')
  comparison(@Param('code') code: string, @Query('period') period?: string) {
    return this.service.comparison(code, period);
  }
}
