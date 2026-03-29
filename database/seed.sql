-- =============================================================
-- Paz Church — Development Seed Data
-- Safe to run multiple times (all statements use ON CONFLICT DO NOTHING)
-- Run: psql $DATABASE_URL -f database/seed.sql
-- =============================================================

-- ─────────────────────────────────────────
-- HOME TAB — Announcements
-- ─────────────────────────────────────────
INSERT INTO announcements (image_url, title, subtitle, markdown_content, action_url)
VALUES
  (
    'https://picsum.photos/seed/paz1/800/400',
    'Culto de Celebração',
    'Domingo às 9h e 19h — venha adorar com a gente!',
    E'# Culto de Celebração\n\nEste domingo temos dois cultos especiais.\n\n**Manhã:** 9h00\n**Noite:** 19h00\n\nTraga sua família e seus amigos. Será um tempo incrível de adoração e Palavra!',
    NULL
  ),
  (
    'https://picsum.photos/seed/paz2/800/400',
    'Semana de Oração',
    'De segunda a sexta, às 7h da manhã',
    E'# Semana de Oração\n\nJunte-se a nós nesta semana especial de busca e oração.\n\n**Horário:** 7h00 às 8h00\n**Local:** Templo Principal\n\n> "A oração eficaz do justo pode muito." — Tiago 5:16',
    NULL
  ),
  (
    'https://picsum.photos/seed/paz3/800/400',
    'Batismo nas Águas',
    'Dê esse passo de fé — inscrições abertas',
    E'# Batismo nas Águas\n\nVocê deu seu coração ao Senhor e quer confessar publicamente sua fé?\n\nAs inscrições para o próximo batismo estão abertas.\n\n**Como se inscrever:** fale com seu líder de Grupo de Vida ou com a secretaria da igreja.',
    NULL
  ),
  (
    'https://picsum.photos/seed/paz4/800/400',
    'Escola Bíblica',
    'Novos módulos disponíveis — comece agora',
    E'# Escola Bíblica da Fé\n\n## Módulo I — Fundamentos\n\nAprenda os pilares da vida cristã em encontros semanais.\n\n**Quando:** Sábados às 14h\n**Onde:** Sala 3 — 2º andar\n\nInscrições na recepção.',
    NULL
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- HOME TAB — Contribution (bank details)
-- ─────────────────────────────────────────
INSERT INTO contributions (bank_name, branch_number, account_number, pix_key)
VALUES (
  'Banco do Brasil',
  '2920-3',
  '40754-2',
  '18.975.120/0001-70'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- HOME TAB — Events / Agenda
-- ─────────────────────────────────────────
INSERT INTO events (title, date, image_url)
VALUES
  (
    'Culto Domingo Manhã',
    '2026-04-06 09:00:00',
    'https://picsum.photos/seed/ev1/400/200'
  ),
  (
    'Grupo de Vida — Zona Sul',
    '2026-04-08 19:30:00',
    'https://picsum.photos/seed/ev2/400/200'
  ),
  (
    'Encontro de Jovens',
    '2026-04-11 19:00:00',
    'https://picsum.photos/seed/ev3/400/200'
  ),
  (
    'Culto Domingo Noite',
    '2026-04-13 19:00:00',
    'https://picsum.photos/seed/ev4/400/200'
  ),
  (
    'Power Night',
    '2026-04-18 20:00:00',
    'https://picsum.photos/seed/ev5/400/200'
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- CHURCH INFO
-- ─────────────────────────────────────────
INSERT INTO church (id, name, description, address, contact, schedule, social_media)
VALUES (
  1,
  'Igreja da Paz Curitiba',
  'Uma igreja que transforma vidas pelo poder do Evangelho.',
  '{"street":"Rua Padre Agostinho","number":"2.504","neighborhood":"Bigorrilho","city":"Curitiba","state":"PR","zip_code":"80710-000","country":"Brasil","complement":null,"reference":"Próximo ao Shopping Pátio Batel"}',
  '{"phone":"(41) 3244-0808","email":"contato@igrejapaz.com.br","website":"https://www.igrejapaz.com.br"}',
  '{"sunday":{"morning":"09:00","evening":"19:00"},"wednesday":{"morning":null,"evening":"19:30"},"friday":null,"saturday":null}',
  '{"facebook":"https://facebook.com/pazchurch","instagram":"@pazchurch","youtube":"https://youtube.com/pazchurch","twitter":null}'
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  address     = EXCLUDED.address,
  contact     = EXCLUDED.contact,
  schedule    = EXCLUDED.schedule,
  social_media = EXCLUDED.social_media,
  updated_at  = NOW();

-- ─────────────────────────────────────────
-- ACADEMY TAB — Course Tracks
-- ─────────────────────────────────────────
INSERT INTO course_tracks (id, title, description, sort_order)
VALUES
  (1, 'Fundamentos da Fé',    'Conheça os pilares essenciais da vida cristã', 1),
  (2, 'Vida em Comunidade',   'Crescendo juntos no corpo de Cristo',           2),
  (3, 'Discipulado',          'Aprofunde sua caminhada com Deus',               3)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence so future inserts don't clash
SELECT setval('course_tracks_id_seq', (SELECT MAX(id) FROM course_tracks));

-- ─────────────────────────────────────────
-- ACADEMY TAB — Courses
-- ─────────────────────────────────────────
INSERT INTO courses (id, title, description, creator, estimated_hours, category, thumbnail_url, status)
VALUES
  -- Track 1 — Fundamentos da Fé
  ('00000000-0000-0000-0001-000000000001', 'Quem é Jesus?',        'Descubra a identidade de Jesus Cristo e o que ele significa para sua vida.',     'Igreja da Paz', 2, 'fundamentos', 'https://picsum.photos/seed/c1/320/180', 'published'),
  ('00000000-0000-0000-0001-000000000002', 'A Bíblia',             'Como ler, entender e aplicar as Escrituras no dia a dia.',                         'Igreja da Paz', 3, 'fundamentos', 'https://picsum.photos/seed/c2/320/180', 'published'),
  ('00000000-0000-0000-0001-000000000003', 'Oração',               'Aprenda a ter uma vida de oração consistente e transformadora.',                   'Igreja da Paz', 2, 'fundamentos', 'https://picsum.photos/seed/c3/320/180', 'published'),
  -- Track 2 — Vida em Comunidade
  ('00000000-0000-0000-0002-000000000001', 'Grupo de Vida',        'Entenda por que fazer parte de um pequeno grupo transforma sua caminhada.',        'Igreja da Paz', 2, 'comunidade',  'https://picsum.photos/seed/c4/320/180', 'published'),
  ('00000000-0000-0000-0002-000000000002', 'Servindo na Igreja',   'Descubra seus dons e encontre seu lugar no ministério.',                           'Igreja da Paz', 2, 'comunidade',  'https://picsum.photos/seed/c5/320/180', 'published'),
  ('00000000-0000-0000-0002-000000000003', 'Dízimos e Ofertas',    'O princípio bíblico da generosidade e como ele muda nossa perspectiva.',           'Igreja da Paz', 1, 'comunidade',  'https://picsum.photos/seed/c6/320/180', 'published'),
  -- Track 3 — Discipulado
  ('00000000-0000-0000-0003-000000000001', 'Fazendo Discípulos',   'Como multiplicar sua fé e caminhar ao lado de outros na jornada cristã.',         'Igreja da Paz', 3, 'discipulado', 'https://picsum.photos/seed/c7/320/180', 'published'),
  ('00000000-0000-0000-0003-000000000002', 'Caráter Cristão',      'Crescendo nos frutos do Espírito Santo e refletindo a imagem de Cristo.',          'Igreja da Paz', 2, 'discipulado', 'https://picsum.photos/seed/c8/320/180', 'published')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- ACADEMY TAB — Link Courses → Tracks
-- ─────────────────────────────────────────
INSERT INTO course_track_courses (track_id, course_id)
VALUES
  (1, '00000000-0000-0000-0001-000000000001'),
  (1, '00000000-0000-0000-0001-000000000002'),
  (1, '00000000-0000-0000-0001-000000000003'),
  (2, '00000000-0000-0000-0002-000000000001'),
  (2, '00000000-0000-0000-0002-000000000002'),
  (2, '00000000-0000-0000-0002-000000000003'),
  (3, '00000000-0000-0000-0003-000000000001'),
  (3, '00000000-0000-0000-0003-000000000002')
ON CONFLICT DO NOTHING;
