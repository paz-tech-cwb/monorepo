import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFormulariosSchema1780164488347 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Add area_id to sectors (needed for area_leader scope resolution)
    await queryRunner.query(`
      ALTER TABLE sectors ADD COLUMN IF NOT EXISTS area_id int REFERENCES areas(id) ON DELETE SET NULL;
    `);

    // 1. Audit log
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_submission_audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_slug varchar(64) NOT NULL,
        submission_id varchar(64) NOT NULL,
        "actorId" int NOT NULL REFERENCES users(id),
        action varchar(16) NOT NULL,
        diff jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_form_submission ON form_submission_audit_log(form_slug, submission_id);
    `);

    // 2. Church settings (simple kv)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS church_settings (
        key varchar(64) PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 3. Form courses (DIFFERENT from existing 'courses' academy table) + form_course_links
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS form_course_links (
        form_slug varchar(64) NOT NULL,
        course_id uuid NOT NULL REFERENCES form_courses(id) ON DELETE CASCADE,
        display_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (form_slug, course_id)
      );
    `);

    // 4. member_registrations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS member_registrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(180) NOT NULL,
        full_name varchar(180) NOT NULL,
        birth_date date NOT NULL,
        phone varchar(32) NOT NULL,
        gender varchar(2) NOT NULL,
        civil_state varchar(20) NOT NULL,
        cep varchar(9),
        street varchar(180),
        address_number varchar(30),
        complement varchar(120),
        neighborhood varchar(120),
        city varchar(120),
        state varchar(2),
        address text,
        sector_id int NOT NULL REFERENCES sectors(id),
        life_group_id int REFERENCES life_groups(id),
        leader_id int REFERENCES users(id),
        completed_courses uuid[] NOT NULL DEFAULT '{}',
        "submittedById" int NOT NULL REFERENCES users(id),
        area_id int,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_mreg_scope ON member_registrations(area_id, sector_id, life_group_id);
    `);

    // 5. form_conversions (DIFFERENT from existing 'conversions' table)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_conversions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name varchar(180) NOT NULL,
        email varchar(180) NOT NULL,
        phone varchar(32) NOT NULL,
        decision_type varchar(20) NOT NULL,
        how_met_church varchar(40) NOT NULL,
        how_met_church_other varchar(180),
        gender varchar(2) NOT NULL,
        birth_date date NOT NULL,
        civil_state varchar(20) NOT NULL,
        cep varchar(9),
        street varchar(180),
        address_number varchar(30),
        complement varchar(120),
        neighborhood varchar(120),
        city varchar(120),
        state varchar(2),
        address text NOT NULL,
        attendance_count varchar(40) NOT NULL,
        life_group_status varchar(40) NOT NULL,
        life_group_leader_or_name varchar(180),
        invited_by varchar(180),
        notes text,
        "submittedById" int NOT NULL REFERENCES users(id),
        area_id int, sector_id int, life_group_id int,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_fconv_scope ON form_conversions(area_id, sector_id, life_group_id);
    `);

    // 6. life_group_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS life_group_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        area_id int NOT NULL,
        sector_id int NOT NULL,
        life_group_id int NOT NULL,
        committed_members int NOT NULL,
        committed_members_present int NOT NULL,
        kids_0_to_11 int NOT NULL,
        guests int NOT NULL,
        mdas int NOT NULL,
        offering numeric(10,2) NOT NULL DEFAULT 0,
        committed_at_tadel int NOT NULL,
        committed_at_culto int NOT NULL,
        leader_attended text[] NOT NULL DEFAULT '{}',
        disciples_count int NOT NULL,
        disciples_discipled_this_week int NOT NULL,
        pastoring_activity_type varchar(40) NOT NULL,
        pastoring_activity_other varchar(180),
        pastoring_activity_objective text,
        training_activity_type varchar(40) NOT NULL,
        training_activity_other varchar(180),
        "submittedById" int NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_lgr_scope ON life_group_reports(area_id, sector_id, life_group_id);
      CREATE INDEX IF NOT EXISTS idx_lgr_date ON life_group_reports(date);
    `);

    // 7. sector_supervisor_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sector_supervisor_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        sector_id int NOT NULL,
        area_id int,
        life_groups_visited int[] NOT NULL DEFAULT '{}',
        leaders_pastored int[] NOT NULL DEFAULT '{}',
        meetings_held int NOT NULL,
        trainings_conducted int NOT NULL,
        multiplication_candidates int[] NOT NULL DEFAULT '{}',
        notes text,
        "submittedById" int NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_ssr_scope ON sector_supervisor_reports(area_id, sector_id);
    `);

    // 8. area_supervisor_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS area_supervisor_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        area_id int NOT NULL,
        sectors_visited int[] NOT NULL DEFAULT '{}',
        sector_leaders_pastored int[] NOT NULL DEFAULT '{}',
        meetings_held int NOT NULL,
        trainings_conducted int NOT NULL,
        multiplications_in_progress int,
        notes text,
        "submittedById" int NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_asr_scope ON area_supervisor_reports(area_id);
    `);

    // 9. multiplications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS multiplications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        source_life_group_id int NOT NULL,
        area_id int NOT NULL,
        sector_id int NOT NULL,
        completed_leadership_track boolean NOT NULL,
        legally_married boolean NOT NULL,
        faithful_tither boolean NOT NULL,
        evangelizing_and_consolidating boolean NOT NULL,
        good_testimony boolean NOT NULL,
        single_living_in_purity boolean,
        new_life_group_id int,
        new_life_group_name varchar(180) NOT NULL,
        new_leader_id int NOT NULL REFERENCES users(id),
        host_id int NOT NULL REFERENCES users(id),
        address text NOT NULL,
        leader_phone varchar(32) NOT NULL,
        meeting_day_time timestamptz NOT NULL,
        members_to_move int[] NOT NULL DEFAULT '{}',
        new_members int[] NOT NULL DEFAULT '{}',
        "submittedById" int NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_mult_scope ON multiplications(area_id, sector_id);
    `);

    // 10. service_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        service_type varchar(40) NOT NULL,
        service_type_other varchar(180),
        total_attendance int NOT NULL,
        members_present int NOT NULL,
        guests_present int NOT NULL,
        kids_present int NOT NULL,
        decisions_for_christ int NOT NULL,
        reconciliations int NOT NULL,
        baptism_candidates int,
        offering numeric(10,2) NOT NULL,
        notes text,
        "submittedById" int NOT NULL REFERENCES users(id),
        area_id int, sector_id int, life_group_id int,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_sr_date ON service_reports(date);
    `);

    // 11. guests (form)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_guests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name varchar(180) NOT NULL,
        email varchar(180),
        phone varchar(32) NOT NULL,
        address text,
        invited_by varchar(180) NOT NULL,
        how_met_church varchar(40),
        notes text,
        "submittedById" int NOT NULL REFERENCES users(id),
        area_id int, sector_id int, life_group_id int,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_fguests_scope ON form_guests(area_id, sector_id, life_group_id);
    `);

    // 12. Seed form_courses
    await queryRunner.query(`
      INSERT INTO form_courses (name) VALUES
        ('Acompanhamento Inicial Nível 1'),
        ('Acompanhamento Inicial Nível 2'),
        ('Nova Criatura'),
        ('Estação DNA'),
        ('Expresso 1'),
        ('Expresso 2'),
        ('Café com Pastor'),
        ('É Batizado'),
        ('Encontro com Deus');
    `);
    await queryRunner.query(`
      INSERT INTO form_course_links (form_slug, course_id, display_order)
      SELECT 'member-registrations', id, ROW_NUMBER() OVER (ORDER BY name)
      FROM form_courses;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of [
      'form_guests', 'service_reports', 'multiplications', 'area_supervisor_reports',
      'sector_supervisor_reports', 'life_group_reports', 'form_conversions', 'member_registrations',
      'form_course_links', 'form_courses', 'church_settings', 'form_submission_audit_log',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
    }
  }

}
