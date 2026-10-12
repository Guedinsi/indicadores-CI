import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Axis } from './entities/axis.entity.js';
import { IndicatorValue } from './entities/indicator-value.entity.js';
import { Indicator } from './entities/indicator.entity.js';
import { Territory, TerritoryType } from './entities/territory.entity.js';

export interface AxisResponse {
  id: number;
  slug: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  indicatorCount: number;
}

export interface IndicatorCardResponse {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  axisSlug: string;
  axisAbbreviation: string | null;
  /** Período do valor retornado (ou o período pedido, quando não há valor). */
  period: string | null;
  /** null = sem dado. */
  value: number | null;
}

export interface SeriesResponse {
  indicator: { code: string; name: string; unit: string | null };
  territory: { code: string; name: string; type: TerritoryType };
  points: { period: string; value: number | null }[];
}

export interface ComparisonResponse {
  indicator: { code: string; name: string; unit: string | null };
  period: string | null;
  values: { territory: string; type: TerritoryType; value: number | null }[];
}

const TERRITORY_ORDER: Record<TerritoryType, number> = {
  [TerritoryType.MUNICIPALITY]: 0,
  [TerritoryType.REGION]: 1,
  [TerritoryType.STATE]: 2,
  [TerritoryType.COUNTRY]: 3,
};

@Injectable()
export class IndicatorsService {
  /** Código IBGE do município foco do dashboard (Campo Mourão-PR). Confira e ajuste no .env se preciso. */
  private readonly cityCode: string;

  constructor(
    @InjectRepository(Axis) private readonly axes: Repository<Axis>,
    @InjectRepository(Indicator) private readonly indicators: Repository<Indicator>,
    @InjectRepository(Territory) private readonly territories: Repository<Territory>,
    @InjectRepository(IndicatorValue) private readonly values: Repository<IndicatorValue>,
    config: ConfigService,
  ) {
    this.cityCode = config.get<string>('CITY_IBGE_CODE') ?? '4104303';
  }

  async listAxes(): Promise<AxisResponse[]> {
    const [axes, counts] = await Promise.all([
      this.axes.find({ order: { name: 'ASC' } }),
      this.indicators
        .createQueryBuilder('i')
        .select('i.axisId', 'axisId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('i.axisId')
        .getRawMany<{ axisId: number; count: string }>(),
    ]);
    const countByAxis = new Map(counts.map((c) => [Number(c.axisId), Number(c.count)]));

    return axes.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      abbreviation: a.abbreviation,
      description: a.description,
      indicatorCount: countByAxis.get(a.id) ?? 0,
    }));
  }

  /** Períodos que têm algum valor gravado, do mais recente para o mais antigo. */
  async listPeriods(): Promise<string[]> {
    const rows = await this.values
      .createQueryBuilder('v')
      .select('v.period', 'period')
      .distinct(true)
      .orderBy('v.period', 'DESC')
      .getRawMany<{ period: string }>();
    return rows.map((r) => r.period);
  }

  /**
   * Cards do dashboard: todos os indicadores (opcionalmente de um eixo) com o valor
   * do município. Sem `period`, usa o valor mais recente de cada indicador.
   * Indicadores sem dado voltam com value = null (o front mostra "--").
   */
  async latest(axisSlug?: string, period?: string): Promise<IndicatorCardResponse[]> {
    const qb = this.indicators
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.axis', 'a')
      .orderBy('a.name', 'ASC')
      .addOrderBy('i.name', 'ASC');
    if (axisSlug) qb.where('a.slug = :axisSlug', { axisSlug });

    const list = await qb.getMany();
    if (list.length === 0) return [];

    const vq = this.values
      .createQueryBuilder('v')
      .distinctOn(['v.indicatorId'])
      .innerJoin('v.territory', 't')
      .where('v.indicatorId IN (:...ids)', { ids: list.map((i) => i.id) })
      .andWhere('t.type = :type', { type: TerritoryType.MUNICIPALITY })
      .andWhere('t.code = :code', { code: this.cityCode })
      .andWhere('v.value IS NOT NULL')
      .orderBy('v.indicatorId', 'ASC')
      .addOrderBy('v.period', 'DESC');
    if (period) vq.andWhere('v.period = :period', { period });

    const found = await vq.getMany();
    const byIndicator = new Map(found.map((v) => [v.indicatorId, v]));

    return list.map((i) => {
      const v = byIndicator.get(i.id);
      return {
        code: i.code,
        name: i.name,
        description: i.description,
        unit: i.unit,
        axisSlug: i.axis.slug,
        axisAbbreviation: i.axis.abbreviation,
        period: v?.period ?? period ?? null,
        value: v?.value ?? null,
      };
    });
  }

  /** Série temporal de um indicador para um território (padrão: o município). */
  async series(code: string, territoryCode?: string): Promise<SeriesResponse> {
    const indicator = await this.requireIndicator(code);

    const territory = await this.territories.findOne({
      where: territoryCode
        ? { code: territoryCode }
        : { type: TerritoryType.MUNICIPALITY, code: this.cityCode },
    });
    if (!territory) {
      throw new NotFoundException(
        `Território ${territoryCode ?? this.cityCode} não encontrado`,
      );
    }

    const rows = await this.values.find({
      where: { indicatorId: indicator.id, territoryId: territory.id },
      order: { period: 'ASC' },
    });

    return {
      indicator: { code: indicator.code, name: indicator.name, unit: indicator.unit },
      territory: { code: territory.code, name: territory.name, type: territory.type },
      points: rows.map((r) => ({ period: r.period, value: r.value })),
    };
  }

  /**
   * Município x região x estado x país no MESMO período.
   * Sem `period`, usa o período mais recente que tenha algum valor para o indicador.
   */
  async comparison(code: string, period?: string): Promise<ComparisonResponse> {
    const indicator = await this.requireIndicator(code);

    const target = period ?? (await this.latestPeriod(indicator.id));
    if (!target) {
      return {
        indicator: { code: indicator.code, name: indicator.name, unit: indicator.unit },
        period: null,
        values: [],
      };
    }

    const rows = await this.values.find({
      where: { indicatorId: indicator.id, period: target },
      relations: { territory: true },
    });

    rows.sort(
      (a, b) => TERRITORY_ORDER[a.territory.type] - TERRITORY_ORDER[b.territory.type],
    );

    return {
      indicator: { code: indicator.code, name: indicator.name, unit: indicator.unit },
      period: target,
      values: rows.map((r) => ({
        territory: r.territory.name,
        type: r.territory.type,
        value: r.value,
      })),
    };
  }

  private async latestPeriod(indicatorId: number): Promise<string | undefined> {
    const row = await this.values.findOne({
      where: { indicatorId },
      order: { period: 'DESC' },
    });
    return row?.period;
  }

  private async requireIndicator(code: string): Promise<Indicator> {
    const indicator = await this.indicators.findOne({ where: { code } });
    if (!indicator) throw new NotFoundException(`Indicador ${code} não encontrado`);
    return indicator;
  }
}
