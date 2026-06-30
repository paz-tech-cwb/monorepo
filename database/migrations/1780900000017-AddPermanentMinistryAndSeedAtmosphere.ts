import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermanentMinistryAndSeedAtmosphere1780900000017
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);

    await q(
      `ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "slug" varchar(80) UNIQUE`,
    );
    await q(
      `ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "is_permanent" boolean NOT NULL DEFAULT false`,
    );

    // Seed the Atmosfera ministry as permanent.
    // leader_id is NULL because no users exist yet; this is intentional.
    await q(`
      INSERT INTO "ministries" (name, slug, is_permanent, membership_mode, description)
      VALUES ('Atmosfera', 'atmosfera', true, 'teams', 'Ministério de Atmosfera — equipes de serviço no culto')
      ON CONFLICT (slug) DO UPDATE SET is_permanent = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);
    await q(`DELETE FROM "ministries" WHERE slug = 'atmosfera'`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "is_permanent"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "slug"`);
  }
}
