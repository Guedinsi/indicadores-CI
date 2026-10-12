import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { IngestionRun } from '../../ingestion/entities/ingestion-run.entity.js';
import { Indicator } from './indicator.entity.js';
import { Territory } from './territory.entity.js';

/**
 * Valor de um indicador para um território em um período.
 * A restrição única garante que reingerir os mesmos dados não duplica linhas (upsert).
 */
@Entity('indicator_value')
@Unique('UQ_indicator_value_key', ['indicatorId', 'territoryId', 'period'])
export class IndicatorValue {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_indicator_value' })
  id: number;

  @Column({ name: 'indicator_id', type: 'int' })
  indicatorId: number;

  @ManyToOne(() => Indicator, (indicator) => indicator.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'indicator_id',
    foreignKeyConstraintName: 'FK_indicator_value_indicator',
  })
  indicator: Relation<Indicator>;

  @Column({ name: 'territory_id', type: 'int' })
  territoryId: number;

  @ManyToOne(() => Territory, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'territory_id',
    foreignKeyConstraintName: 'FK_indicator_value_territory',
  })
  territory: Relation<Territory>;

  /** Texto ordenável: "2023" (anual) ou "2023-06" (mensal). */
  @Column({ type: 'varchar', length: 20 })
  period: string;

  /** null = "sem dado" (diferente de zero). O Postgres devolve numeric como string, por isso o transformer. */
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  value: number | null;

  @Column({ name: 'ingestion_run_id', type: 'int', nullable: true })
  ingestionRunId: number | null;

  @ManyToOne(() => IngestionRun, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'ingestion_run_id',
    foreignKeyConstraintName: 'FK_indicator_value_ingestion_run',
  })
  ingestionRun: Relation<IngestionRun> | null;

  @Column({ name: 'fetched_at', type: 'timestamptz', default: () => 'now()' })
  fetchedAt: Date;
}
