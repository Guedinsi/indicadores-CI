import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum TerritoryType {
  MUNICIPALITY = 'MUNICIPIO',
  REGION = 'REGIAO',
  STATE = 'ESTADO',
  COUNTRY = 'PAIS',
}

/**
 * Nível territorial ao qual um valor se refere.
 * Hierarquia opcional via parent: município -> região -> estado -> país.
 */
@Entity('territory')
@Unique('UQ_territory_type_code', ['type', 'code'])
@Check(
  'CHK_territory_type',
  `"type" IN ('MUNICIPIO', 'REGIAO', 'ESTADO', 'PAIS')`,
)
export class Territory {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_territory' })
  id: number;

  /** Código IBGE (7 dígitos para município, 2 para UF) ou código próprio (ex.: "COMCAM", "BR"). */
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: TerritoryType;

  @Index('IDX_territory_parent_id')
  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Territory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id', foreignKeyConstraintName: 'FK_territory_parent' })
  parent: Relation<Territory> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
