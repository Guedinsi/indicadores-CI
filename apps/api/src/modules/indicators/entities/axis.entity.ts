import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Indicator } from './indicator.entity.js';

/** Eixo/categoria temática (ex.: Economia, Educação, Saúde). */
@Entity('axis')
@Unique('UQ_axis_slug', ['slug'])
export class Axis {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_axis' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Usado nas URLs e filtros: "economia", "saude"... */
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  /** Sigla exibida no dashboard: "EC", "SA"... */
  @Column({ type: 'varchar', length: 4, nullable: true })
  abbreviation: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Indicator, (indicator) => indicator.axis)
  indicators: Relation<Indicator[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
