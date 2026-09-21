import { MigrationInterface, QueryRunner } from 'typeorm';

type StepSeed = {
  key: string;
  title: string;
  type: 'course_completion' | 'manual_approval' | 'informational';
};

type TrackSeed = {
  key: string;
  title: string;
  eligibilityText: string | null;
  steps: StepSeed[];
};

// All referenced courses ("Estação DNA", "Nova Criatura", "Expresso 1",
// "Expresso 2", "TLC") do not yet exist as real `courses` rows in production
// (only 6 unrelated Diflen-Hub-named courses exist today). Seeding these
// steps as `course_completion` with `course_id = NULL` would (a) never sync
// via JourneyProgressService.syncCourseCompletion, since it matches on
// course_id, and (b) violate JourneyTracksService.assertTypeCourseIdConsistency,
// which requires a course_id whenever type is `course_completion` — blocking
// any admin edit to these steps. So they are seeded as `informational`
// placeholders instead (`type: 'informational'` on the steps below). Once
// matching Course rows exist, convert these to `course_completion` with a
// real `course_id` via the admin-ui.
const TRACKS: TrackSeed[] = [
  {
    key: 'baptism',
    title: 'Trilho para o Batismo',
    eligibilityText:
      'Idade: 13 anos ou mais (exceto se os pais forem cristãos e garantirem que o pré-adolescente esteja pronto para o batismo, então pode ser com 12 anos)',
    steps: [
      {
        key: 'baptism_already_member',
        title: 'Já se tornou membro da Paz Church',
        type: 'manual_approval',
      },
      {
        key: 'baptism_estacao_dna',
        title: 'Completar a Estação DNA',
        type: 'informational',
      },
      {
        key: 'baptism_nova_criatura',
        title: 'Completar a classe Nova Criatura',
        type: 'informational',
      },
      {
        key: 'baptism_acompanhamento',
        title:
          'Completar o acompanhamento inicial pelo menos até a lição 5',
        type: 'manual_approval',
      },
    ],
  },
  {
    key: 'member',
    title: 'Trajetória do Membro',
    eligibilityText: null,
    steps: [
      {
        key: 'member_new_birth',
        title: 'Culto de celebração e o novo nascimento',
        type: 'manual_approval',
      },
      {
        key: 'member_cafe_pastor',
        title: 'Tornar-se membro através do Café com Pastor',
        type: 'manual_approval',
      },
      {
        key: 'member_estacao_dna',
        title: 'Completar a Estação DNA',
        type: 'informational',
      },
      {
        key: 'member_servir_ministerio',
        title: 'Servir em um ministério',
        type: 'manual_approval',
      },
      {
        key: 'member_life_group',
        title: 'Ser membro de um life group',
        type: 'manual_approval',
      },
      {
        key: 'member_nova_criatura',
        title: 'Completar a classe Nova Criatura',
        type: 'informational',
      },
      {
        key: 'member_acompanhamento_livro',
        title:
          'Completar o livro de discipulado do acompanhamento inicial',
        type: 'manual_approval',
      },
      {
        key: 'member_batismo_aguas',
        title: 'Batismo nas águas',
        type: 'manual_approval',
      },
    ],
  },
  {
    key: 'discipler',
    title: 'Trilho do Discipulador',
    eligibilityText: null,
    steps: [
      {
        key: 'discipler_is_member',
        title: 'Ser membro da Paz Church',
        type: 'manual_approval',
      },
      {
        key: 'discipler_congregar',
        title: 'Congregar fielmente no culto de celebração e life group',
        type: 'manual_approval',
      },
      {
        key: 'discipler_acompanhamento_n1',
        title:
          'Completar o acompanhamento inicial nível 1 (e comprometer-se a completar os outros dois níveis, sendo discipulado regularmente)',
        type: 'manual_approval',
      },
      {
        key: 'discipler_nova_criatura',
        title: 'Completar a classe Nova Criatura',
        type: 'informational',
      },
      {
        key: 'discipler_expresso1',
        title: 'Completar o Expresso 1',
        type: 'informational',
      },
      {
        key: 'discipler_espirito_santo',
        title: 'Ser batizado no Espírito Santo',
        type: 'manual_approval',
      },
      {
        key: 'discipler_dizimista',
        title: 'Ser dizimista fiel',
        type: 'manual_approval',
      },
      {
        key: 'discipler_treinamento_video',
        title:
          'Assistir os 3 vídeos de treinamento prático de discipulador',
        type: 'informational',
      },
      {
        key: 'discipler_aprovacao',
        title:
          'Ser aprovado para ser discipulador, pelo líder de life group e pelo discipulador',
        type: 'manual_approval',
      },
    ],
  },
  {
    key: 'leader',
    title: 'Trilho do Líder',
    eligibilityText: null,
    steps: [
      {
        key: 'leader_is_discipler',
        title: 'Ser um discipulador',
        type: 'manual_approval',
      },
      {
        key: 'leader_batizado_imersao',
        title: 'Ser batizado por imersão',
        type: 'manual_approval',
      },
      {
        key: 'leader_tlc',
        title: 'Completar o TLC (vídeo aulas)',
        type: 'informational',
      },
      {
        key: 'leader_expresso2',
        title: 'Completar o Expresso 2',
        type: 'informational',
      },
      {
        key: 'leader_tadel',
        title:
          'Frequentar fielmente o TADEL, pelo menos dois meses antes de liderar',
        type: 'manual_approval',
      },
      {
        key: 'leader_discipulado_n2',
        title:
          'Completar o discipulado nível 2 e continuar sendo discipulado regularmente',
        type: 'manual_approval',
      },
      {
        key: 'leader_auxiliar_lider',
        title:
          'Auxiliar o líder do life group a pastorear e conduzir duas ou mais pessoas através do livro do acompanhamento inicial',
        type: 'manual_approval',
      },
      {
        key: 'leader_vida_exemplar',
        title:
          'Vida cristã exemplar (casamento legalizado) e aprovação para ser líder, pelo discipulador e líder do life group',
        type: 'manual_approval',
      },
      {
        key: 'leader_entrevista_pastor',
        title: 'Entrevista com pastor de rede',
        type: 'manual_approval',
      },
    ],
  },
];

// Maps legacy `member_journey_stages.stage_key` -> the new step keys the
// completed stage should be imported into. `discipler_track` and
// `life_group_leader_track` are intentionally left unmapped: they represent
// "member was fully in this legacy track" rather than completion of any
// single step, and the new step-based model has no equivalent single-step
// target to import them into.
const LEGACY_STAGE_TO_STEP_KEYS: Record<string, string[]> = {
  salvation: ['member_new_birth'],
  registration: [
    'member_cafe_pastor',
    'baptism_already_member',
    'discipler_is_member',
  ],
  first_courses: ['member_estacao_dna', 'baptism_estacao_dna'],
  new_creature_course: [
    'member_nova_criatura',
    'baptism_nova_criatura',
    'discipler_nova_criatura',
  ],
  serving_ministry: ['member_servir_ministerio'],
  life_group: ['member_life_group'],
  initial_discipleship_book: ['member_acompanhamento_livro'],
  water_baptism: ['member_batismo_aguas'],
};

export class SeedJourneyTracks1795600000001 implements MigrationInterface {
  name = 'SeedJourneyTracks1795600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [trackIndex, track] of TRACKS.entries()) {
      const inserted = (await queryRunner.query(
        `
          INSERT INTO "journey_tracks"
            ("key", "title", "eligibility_text", "sort_order", "is_active")
          VALUES ($1, $2, $3, $4, true)
          RETURNING "id"
        `,
        [track.key, track.title, track.eligibilityText, trackIndex],
      )) as Array<{ id: number }>;
      const trackId = inserted[0].id;

      for (const [stepIndex, step] of track.steps.entries()) {
        await queryRunner.query(
          `
            INSERT INTO "journey_track_steps"
              ("track_id", "key", "sort_order", "type", "title", "course_id")
            VALUES ($1, $2, $3, $4, $5, NULL)
          `,
          [trackId, step.key, stepIndex, step.type, step.title],
        );
      }
    }

    const legacyStages = (await queryRunner.query(`
      SELECT "member_id", "stage_key", "completed_at"
      FROM "member_journey_stages"
      WHERE "completed_at" IS NOT NULL
    `)) as Array<{
      member_id: number;
      stage_key: string;
      completed_at: Date;
    }>;

    for (const stage of legacyStages) {
      const stepKeys = LEGACY_STAGE_TO_STEP_KEYS[stage.stage_key];
      if (!stepKeys) continue;

      for (const stepKey of stepKeys) {
        await queryRunner.query(
          `
            INSERT INTO "member_journey_step_progress"
              ("member_id", "step_id", "completed_at", "source", "note")
            SELECT $1, "id", $2, 'legacy_import', 'Importado da jornada anterior.'
            FROM "journey_track_steps"
            WHERE "key" = $3
            ON CONFLICT ("member_id", "step_id") DO NOTHING
          `,
          [stage.member_id, stage.completed_at, stepKey],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "member_journey_step_progress"
      WHERE "source" = 'legacy_import'
    `);
    for (const track of TRACKS) {
      await queryRunner.query(`DELETE FROM "journey_tracks" WHERE "key" = $1`, [
        track.key,
      ]);
    }
  }
}
