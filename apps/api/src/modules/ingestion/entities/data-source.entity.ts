import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum DataSourceAccessType {
  API = 'API',
  CSV = 'CSV',
  XLSX = 'XLSX',
  SCRAPING = 'SCRAPING',
  MANUAL = 'MANUAL',
}

/**
 * Fonte pública de onde os dados vêm (IBGE, INEP, DataSUS...).
 * O nome da classe termina em "Entity" para não colidir com o `DataSource` do TypeORM.
 */
@Entity('data_source')
@Unique('UQ_data_source_name', ['name'])
@Check(
  'CHK_data_source_access_type',
  `"access_type" IN ('API', 'CSV', 'XLSX', 'SCRAPING', 'MANUAL')`,
)
export class DataSourceEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_data_source' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'base_url', type: 'varchar', length: 500, nullable: true })
  baseUrl: string | null;

  @Column({ name: 'access_type', type: 'varchar', length: 20 })
  accessType: DataSourceAccessType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
