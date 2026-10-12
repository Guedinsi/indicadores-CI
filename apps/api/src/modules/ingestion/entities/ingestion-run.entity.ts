import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DataSourceEntity } from './data-source.entity.js';

export enum IngestionStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

/** Uma execução de ingestão de uma fonte (para auditoria e depuração). */
@Entity('ingestion_run')
@Check(
  'CHK_ingestion_run_status',
  `"status" IN ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL')`,
)
export class IngestionRun {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_ingestion_run' })
  id: number;

  @Column({ name: 'data_source_id', type: 'int', nullable: true })
  dataSourceId: number | null;

  @ManyToOne(() => DataSourceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'data_source_id',
    foreignKeyConstraintName: 'FK_ingestion_run_data_source',
  })
  dataSource: Relation<DataSourceEntity> | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: IngestionStatus.RUNNING })
  status: IngestionStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'records_processed', type: 'int', default: 0 })
  recordsProcessed: number;
}
