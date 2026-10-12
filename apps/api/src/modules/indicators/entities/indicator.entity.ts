import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DataSourceEntity } from '../../ingestion/entities/data-source.entity.js';
import { Axis } from './axis.entity.js';
import { IndicatorValue } from './indicator-value.entity.js';

/** Definição de um indicador (o catálogo). Os valores ficam em IndicatorValue. */
@Entity('indicator')
@Unique('UQ_indicator_code', ['code'])
export class Indicator {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_indicator' })
  id: number;

  /** Código estável usado nas URLs da API: "IFGF", "IDHM"... */
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Unidade de medida: "índice", "%", "por 1.000 hab."... */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  /** Texto da fórmula/definição, para exibir e documentar. */
  @Column({ type: 'text', nullable: true })
  formula: string | null;

  /** Ex.: "ANNUAL", "MONTHLY". */
  @Column({ type: 'varchar', length: 20, nullable: true })
  periodicity: string | null;

  @Index('IDX_indicator_axis_id')
  @Column({ name: 'axis_id', type: 'int' })
  axisId: number;

  @ManyToOne(() => Axis, (axis) => axis.indicators, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'axis_id', foreignKeyConstraintName: 'FK_indicator_axis' })
  axis: Relation<Axis>;

  @Column({ name: 'data_source_id', type: 'int', nullable: true })
  dataSourceId: number | null;

  @ManyToOne(() => DataSourceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'data_source_id',
    foreignKeyConstraintName: 'FK_indicator_data_source',
  })
  dataSource: Relation<DataSourceEntity> | null;

  @OneToMany(() => IndicatorValue, (value) => value.indicator)
  values: Relation<IndicatorValue[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
