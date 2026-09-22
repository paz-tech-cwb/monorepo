import { MigrationInterface, QueryRunner } from 'typeorm';

type StepSeed = {
  key: string;
  title: string;
  description: string | null;
};

const STEPS: StepSeed[] = [
  {
    key: 'become_member_cafe_pastor',
    title: 'Participar do Café com Pastor',
    description: null,
  },
  {
    key: 'become_member_compromisso',
    title:
      'Congregar fielmente no culto de celebração, no Life Group ou servir em um ministério',
    description:
      'Uma ou mais destas três coisas: congregar fielmente no culto de celebração; congregar fielmente no Life Group; servir em um ministério.',
  },
  {
    key: 'become_member_ficha',
    title: 'Preencher a ficha positivamente',
    description:
      'Já recebeu Jesus como Senhor e Salvador da sua vida e concorda com a declaração de fé.',
  },
];

export class SeedBecomeMemberTrack1795700000002 implements MigrationInterface {
  name = 'SeedBecomeMemberTrack1795700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const inserted = (await queryRunner.query(
      `
        INSERT INTO "journey_tracks"
          ("key", "title", "eligibility_text", "sort_order", "is_active", "promotes_to_role")
        VALUES ('become_member', 'Como se tornar Membro', NULL, -1, true, 'member')
        ON CONFLICT ("key") DO NOTHING
        RETURNING "id"
      `,
    )) as Array<{ id: number }>;

    if (inserted.length === 0) return;
    const trackId = inserted[0].id;

    for (const [index, step] of STEPS.entries()) {
      await queryRunner.query(
        `
          INSERT INTO "journey_track_steps"
            ("track_id", "key", "sort_order", "type", "title", "description", "course_id")
          VALUES ($1, $2, $3, 'manual_approval', $4, $5, NULL)
          ON CONFLICT ("track_id", "key") DO NOTHING
        `,
        [trackId, step.key, index, step.title, step.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const step of STEPS) {
      await queryRunner.query(
        `DELETE FROM "journey_track_steps" WHERE "key" = $1`,
        [step.key],
      );
    }
    await queryRunner.query(
      `DELETE FROM "journey_tracks" WHERE "key" = 'become_member'`,
    );
  }
}
