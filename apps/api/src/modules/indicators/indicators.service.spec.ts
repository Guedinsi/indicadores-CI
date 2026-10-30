
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IndicatorsService } from './indicators.service.js';
import { TerritoryType } from './entities/territory.entity.js';

describe('IndicatorsService', () => {
  let valueFindOne: ReturnType<typeof vi.fn>;
  let service: IndicatorsService;
  let indicators: {
  createQueryBuilder: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};
let values: {
  createQueryBuilder: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};

  let indicatorQuery: Record<string, ReturnType<typeof vi.fn>>;
  let valueQuery: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    valueFindOne = vi.fn();
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
  findOne: vi.fn(),
};

 values = {
  createQueryBuilder: vi.fn().mockReturnValue(valueQuery),
  find: vi.fn(),
  findOne: valueFindOne,
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

it('retorna a série temporal de um indicador', async () => {
  indicators.findOne.mockResolvedValue({
    id: 2,
    code: 'IFDM',
    name: 'IFDM',
    unit: 'índice',
  });

  const territory = {
    id: 1,
    code: '4104303',
    name: 'Campo Mourão',
    type: TerritoryType.MUNICIPALITY,
  };

  const rows = [
    { period: '2010', value: 0.7 },
    { period: '2016', value: 0.8555 },
  ];

  const territories = {
    findOne: vi.fn().mockResolvedValue(territory),
  };

  // Substitui temporariamente o repositório de territórios no serviço.
  (service as unknown as { territories: typeof territories }).territories =
    territories;

  values.find.mockResolvedValue(rows);

  await expect(service.series('IFDM')).resolves.toEqual({
    indicator: {
      code: 'IFDM',
      name: 'IFDM',
      unit: 'índice',
    },
    territory: {
      code: '4104303',
      name: 'Campo Mourão',
      type: TerritoryType.MUNICIPALITY,
    },
    points: [
      { period: '2010', value: 0.7 },
      { period: '2016', value: 0.8555 },
    ],
  });
});

it('lança erro quando o indicador não existe', async () => {
  indicators.findOne.mockResolvedValue(null);

  await expect(service.series('INVALIDO')).rejects.toThrow(
    'Indicador INVALIDO não encontrado',
  );
});

it('retorna a comparação dos territórios no período informado', async () => {
  indicators.findOne.mockResolvedValue({
    id: 2,
    code: 'IFDM',
    name: 'IFDM',
    unit: 'índice',
  });

  const rows = [
    {
      territory: {
        name: 'Paraná',
        type: TerritoryType.STATE,
      },
      value: 0.8,
    },
    {
      territory: {
        name: 'Campo Mourão',
        type: TerritoryType.MUNICIPALITY,
      },
      value: 0.8555,
    },
  ];

  values.find.mockResolvedValue(rows);

  const result = await service.comparison('IFDM', '2016');

  expect(result.indicator.code).toBe('IFDM');
  expect(result.period).toBe('2016');
  expect(result.values).toHaveLength(2);
  expect(result.values[0].territory).toBe('Campo Mourão');
  expect(result.values[1].territory).toBe('Paraná');
});

it('retorna valores vazios quando o indicador não possui períodos', async () => {
  indicators.findOne.mockResolvedValue({
    id: 3,
    code: 'IDHM',
    name: 'IDHM',
    unit: 'índice',
  });

  valueFindOne.mockResolvedValue(null);

  const result = await service.comparison('IDHM');

  expect(result).toEqual({
    indicator: {
      code: 'IDHM',
      name: 'IDHM',
      unit: 'índice',
    },
    period: null,
    values: [],
  });

  expect(values.find).not.toHaveBeenCalled();
});
});
