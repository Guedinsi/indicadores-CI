import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791763200000 implements MigrationInterface {
  name = 'InitialSchema1791763200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- axis ----------
    await queryRunner.query(`
      CREATE TABLE "axis" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "abbreviation" character varying(4),
        "description" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_axis_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_axis" PRIMARY KEY ("id")
      )
    `);

    // ---------- data_source ----------
    await queryRunner.query(`
      CREATE TABLE "data_source" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "base_url" character varying(500),
        "access_type" character varying(20) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_data_source_name" UNIQUE ("name"),
        CONSTRAINT "CHK_data_source_access_type" CHECK ("access_type" IN ('API', 'CSV', 'XLSX', 'SCRAPING', 'MANUAL')),
        CONSTRAINT "PK_data_source" PRIMARY KEY ("id")
      )
    `);

    // ---------- territory ----------
    await queryRunner.query(`
      CREATE TABLE "territory" (
        "id" SERIAL NOT NULL,
        "code" character varying(20) NOT NULL,
        "name" character varying(150) NOT NULL,
        "type" character varying(20) NOT NULL,
        "parent_id" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_territory_type_code" UNIQUE ("type", "code"),
        CONSTRAINT "CHK_territory_type" CHECK ("type" IN ('MUNICIPIO', 'REGIAO', 'ESTADO', 'PAIS')),
        CONSTRAINT "PK_territory" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_territory_parent_id" ON "territory" ("parent_id")`,
    );

    // ---------- indicator ----------
    await queryRunner.query(`
      CREATE TABLE "indicator" (
        "id" SERIAL NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "unit" character varying(50),
        "formula" text,
        "periodicity" character varying(20),
        "axis_id" integer NOT NULL,
        "data_source_id" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_indicator_code" UNIQUE ("code"),
        CONSTRAINT "PK_indicator" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_indicator_axis_id" ON "indicator" ("axis_id")`,
    );

    // ---------- ingestion_run ----------
    await queryRunner.query(`
      CREATE TABLE "ingestion_run" (
        "id" SERIAL NOT NULL,
        "data_source_id" integer,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "status" character varying(20) NOT NULL DEFAULT 'RUNNING',
        "error" text,
        "records_processed" integer NOT NULL DEFAULT '0',
        CONSTRAINT "CHK_ingestion_run_status" CHECK ("status" IN ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL')),
        CONSTRAINT "PK_ingestion_run" PRIMARY KEY ("id")
      )
    `);

    // ---------- indicator_value ----------
    await queryRunner.query(`
      CREATE TABLE "indicator_value" (
        "id" SERIAL NOT NULL,
        "indicator_id" integer NOT NULL,
        "territory_id" integer NOT NULL,
        "period" character varying(20) NOT NULL,
        "value" numeric(18,4),
        "ingestion_run_id" integer,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_indicator_value_key" UNIQUE ("indicator_id", "territory_id", "period"),
        CONSTRAINT "PK_indicator_value" PRIMARY KEY ("id")
      )
    `);

    // ---------- chaves estrangeiras ----------
    await queryRunner.query(`
      ALTER TABLE "territory" ADD CONSTRAINT "FK_territory_parent"
      FOREIGN KEY ("parent_id") REFERENCES "territory"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "indicator" ADD CONSTRAINT "FK_indicator_axis"
      FOREIGN KEY ("axis_id") REFERENCES "axis"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "indicator" ADD CONSTRAINT "FK_indicator_data_source"
      FOREIGN KEY ("data_source_id") REFERENCES "data_source"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_run" ADD CONSTRAINT "FK_ingestion_run_data_source"
      FOREIGN KEY ("data_source_id") REFERENCES "data_source"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "indicator_value" ADD CONSTRAINT "FK_indicator_value_indicator"
      FOREIGN KEY ("indicator_id") REFERENCES "indicator"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "indicator_value" ADD CONSTRAINT "FK_indicator_value_territory"
      FOREIGN KEY ("territory_id") REFERENCES "territory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "indicator_value" ADD CONSTRAINT "FK_indicator_value_ingestion_run"
      FOREIGN KEY ("ingestion_run_id") REFERENCES "ingestion_run"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "indicator_value"`);
    await queryRunner.query(`DROP TABLE "ingestion_run"`);
    await queryRunner.query(`DROP TABLE "indicator"`);
    await queryRunner.query(`DROP TABLE "territory"`);
    await queryRunner.query(`DROP TABLE "data_source"`);
    await queryRunner.query(`DROP TABLE "axis"`);
  }
}
