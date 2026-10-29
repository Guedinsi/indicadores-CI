
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IndicatorsService } from './indicators.service.js';
import { TerritoryType } from './entities/territory.entity.js';

describe('IndicatorsService', () => {
  let service: IndicatorsService;
  let indicators: { createQueryBuilder: ReturnType<typeof vi.fn> };
  let values: { createQueryBuilder: ReturnType<typeof vi.fn> };

  let indicatorQuery: Record<string, ReturnType<typeof vi.fn>>;
  let valueQuery: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    indicatorQuery = {
      innerJoinAndSelect: vi.fn(),
      orderBy: vi.fn(),
      addOrderBy: vi.fn(),
      where: vi.fn(),
      getMany: vi.fn(),
    };

    valueQuery = {
      distinctOn: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      andWhere: vi.fn(),
      orderBy: vi.fn(),
      addOrderBy: vi.fn(),
      getMany: vi.fn(),
    };

    Object.values(indicatorQuery).forEach((method) => {
      method.mockReturnValue(indicatorQuery);
    });

    Object.values(valueQuery).forEach((method) => {
      method.mockReturnValue(valueQuery);
    });

    indicators = {
      createQueryBuilder: vi.fn().mockReturnValue(indicatorQuery),
    };

    values = {
      createQueryBuilder: vi.fn().mockReturnValue(valueQuery),
    };

    service = new IndicatorsService(
      {} as never,
      indicators as never,
      {} as never,
      values as never,
      { get: vi.fn().mockReturnValue('4104303') } as never,
    );
  });

  it('retorna uma lista vazia quando não existem indicadores', async () => {
    indicatorQuery.getMany.mockResolvedValue([]);

    await expect(service.latest()).resolves.toEqual([]);

    expect(values.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('retorna os indicadores com seus valores', async () => {
    const indicator = {
      id: 1,
      code: 'IFDM',
      name: 'IFDM',
      description: 'Índice Firjan de Desenvolvimento Municipal',
      unit: 'índice',
      axis: {
        slug: 'desenvolvimento',
        abbreviation: 'DE',
      },
    };

    indicatorQuery.getMany.mockResolvedValue([indicator]);

    valueQuery.getMany.mockResolvedValue([
      {
        indicatorId: 1,
        period: '2016',
        value: 0.8555,
      },
    ]);

    await expect(service.latest()).resolves.toEqual([
      {
        code: 'IFDM',
        name: 'IFDM',
        description: 'Índice Firjan de Desenvolvimento Municipal',
        unit: 'índice',
        axisSlug: 'desenvolvimento',
        axisAbbreviation: 'DE',
        period: '2016',
        value: 0.8555,
      },
    ]);
  });

  it('retorna null para o valor de um indicador sem dados', async () => {
    indicatorQuery.getMany.mockResolvedValue([
      {
        id: 3,
        code: 'IDHM',
        name: 'IDHM',
        description: 'Índice de Desenvolvimento Humano Municipal',
        unit: 'índice',
        axis: {
          slug: 'desenvolvimento',
          abbreviation: 'DE',
        },
      },
    ]);

    valueQuery.getMany.mockResolvedValue([]);

    const result = await service.latest();

    expect(result[0].value).toBeNull();
    expect(result[0].period).toBeNull();
  });
});
