import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IndicatorKindPolarity1794888000000 implements MigrationInterface {
  name = 'IndicatorKindPolarity1794888000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "indicator"
        ADD "kind" character varying(10),
        ADD "polarity" character varying(20),
        ADD CONSTRAINT "CHK_indicator_kind" CHECK ("kind" IN ('TOTAL', 'RATE')),
        ADD CONSTRAINT "CHK_indicator_polarity" CHECK ("polarity" IN ('HIGHER_BETTER', 'LOWER_BETTER'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "indicator"
        DROP CONSTRAINT "CHK_indicator_polarity",
        DROP CONSTRAINT "CHK_indicator_kind",
        DROP COLUMN "polarity",
        DROP COLUMN "kind"
    `);
  }
}
