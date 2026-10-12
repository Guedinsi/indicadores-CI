import { Controller, Get, Param, Query } from '@nestjs/common';
import { IndicatorsService } from './indicators.service.js';

@Controller()
export class IndicatorsController {
  constructor(private readonly service: IndicatorsService) {}

  /** Eixos com a contagem de indicadores. */
  @Get('axes')
  axes() {
    return this.service.listAxes();
  }

  /** Períodos disponíveis (para o filtro do dashboard). */
  @Get('periods')
  periods() {
    return this.service.listPeriods();
  }

  /** Cards: ?axis=<slug>&period=<período>. Ambos opcionais. */
  @Get('indicators/latest')
  latest(@Query('axis') axis?: string, @Query('period') period?: string) {
    return this.service.latest(axis, period);
  }

  /** Série temporal: ?territory=<código> (padrão: o município). */
  @Get('indicators/:code/values')
  series(@Param('code') code: string, @Query('territory') territory?: string) {
    return this.service.series(code, territory);
  }

  /** Comparativo entre territórios: ?period=<período> (padrão: o mais recente). */
  @Get('indicators/:code/comparison')
  comparison(@Param('code') code: string, @Query('period') period?: string) {
    return this.service.comparison(code, period);
  }
}
