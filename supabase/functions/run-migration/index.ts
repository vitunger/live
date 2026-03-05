import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sql = `
CREATE TABLE IF NOT EXISTS public.scompler_posts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title           TEXT NOT NULL,
    caption         TEXT,
    format          TEXT NOT NULL,
    kanaele         TEXT[] DEFAULT '{}',
    standort_id     UUID REFERENCES standorte(id),
    thema           TEXT,
    marke           TEXT,
    collab_partner  TEXT,
    geplant_am      TIMESTAMPTZ,
    status          TEXT DEFAULT 'entwurf',
    source          TEXT DEFAULT 'planned',
    platform_post_id TEXT,
    views           INTEGER DEFAULT 0,
    likes           INTEGER DEFAULT 0,
    comments        INTEGER DEFAULT 0,
    shares          INTEGER DEFAULT 0,
    subs            INTEGER DEFAULT 0,
    erstellt_von    UUID REFERENCES users(id),
    erstellt_am     TIMESTAMPTZ DEFAULT NOW(),
    aktualisiert_am TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.scompler_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scompler_posts' AND policyname='HQ full access scompler_posts') THEN
    CREATE POLICY "HQ full access scompler_posts" ON public.scompler_posts FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_scompler_posts_status ON scompler_posts(status);
CREATE INDEX IF NOT EXISTS idx_scompler_posts_geplant ON scompler_posts(geplant_am);
CREATE INDEX IF NOT EXISTS idx_scompler_posts_standort ON scompler_posts(standort_id);

CREATE TABLE IF NOT EXISTS public.scompler_wettbewerber (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    typ             TEXT DEFAULT 'haendler',
    ig_follower     INTEGER,
    ig_avg_likes    NUMERIC(10,2),
    ig_avg_comments NUMERIC(10,2),
    ig_eng          NUMERIC(6,4),
    ig_posts        INTEGER,
    fb_follower     INTEGER,
    fb_avg_likes    NUMERIC(10,2),
    fb_avg_comments NUMERIC(10,2),
    fb_eng          NUMERIC(6,4),
    fb_posts        INTEGER,
    tt_follower     INTEGER,
    tt_avg_likes    NUMERIC(10,2),
    tt_avg_comments NUMERIC(10,2),
    tt_eng          NUMERIC(6,4),
    tt_posts        INTEGER,
    tt_info         TEXT,
    yt_follower     INTEGER,
    quelle          TEXT DEFAULT 'Manuell',
    sync_datum      DATE DEFAULT CURRENT_DATE,
    erstellt_am     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.scompler_wettbewerber ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scompler_wettbewerber' AND policyname='HQ full access scompler_wettbewerber') THEN
    CREATE POLICY "HQ full access scompler_wettbewerber" ON public.scompler_wettbewerber FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.scompler_tags (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kategorie   TEXT NOT NULL,
    wert        TEXT NOT NULL,
    UNIQUE(kategorie, wert)
);
ALTER TABLE public.scompler_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scompler_tags' AND policyname='HQ full access scompler_tags') THEN
    CREATE POLICY "HQ full access scompler_tags" ON public.scompler_tags FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
  END IF;
END $$;

INSERT INTO public.modul_status (modul_key, status, name, beschreibung)
VALUES ('scompler', 'aktiv', 'Scompler', 'Social Media Intelligence')
ON CONFLICT (modul_key) DO NOTHING;
`;

const WETTBEWERBER = [
  { name: 'vit:bikes', typ: 'netzwerk', ig_follower: 10000, ig_avg_likes: 44.10, ig_avg_comments: 2.97, ig_eng: 0.0047, ig_posts: 49, fb_follower: 11000, fb_avg_likes: 33.47, fb_avg_comments: 3.03, fb_eng: 0.0035, fb_posts: 22, tt_follower: 13000, tt_avg_likes: 70.40, tt_avg_comments: 5.15, tt_eng: 0.0171, tt_posts: 18, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'Stadler', typ: 'haendler', ig_follower: 11000, ig_avg_likes: 15.20, ig_avg_comments: 1.40, ig_eng: 0.0015, ig_posts: 21, fb_follower: 14000, fb_avg_likes: 5.07, fb_avg_comments: 0.33, fb_eng: 0.0004, fb_posts: 16, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'Little John Bikes', typ: 'haendler', ig_follower: 16000, ig_avg_likes: 42.12, ig_avg_comments: 4.12, ig_eng: 0.0030, ig_posts: 115, fb_follower: 14000, fb_avg_likes: 8.36, fb_avg_comments: 0.61, fb_eng: 0.0007, fb_posts: 28, tt_follower: 1217, tt_avg_likes: 32.58, tt_avg_comments: 0.69, tt_eng: 0.0164, tt_posts: 27, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'Lucky Bike', typ: 'haendler', ig_follower: 20000, ig_avg_likes: 467.50, ig_avg_comments: 79.60, ig_eng: 0.0268, ig_posts: 48, fb_follower: 21000, fb_avg_likes: 10.00, fb_avg_comments: 1.00, fb_eng: 0.0006, fb_posts: 16, tt_follower: 21000, tt_avg_likes: 1676.00, tt_avg_comments: 376.67, tt_eng: 0.0192, tt_posts: 4, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'emotion', typ: 'haendler', ig_follower: 15000, ig_avg_likes: 23.00, ig_avg_comments: 2.00, ig_eng: 0.0015, ig_posts: 9, fb_follower: 5309, fb_avg_likes: 6.50, fb_avg_comments: 0.00, fb_eng: 0.0016, fb_posts: 4, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'Fahrrad XXL', typ: 'haendler', ig_follower: 31000, ig_avg_likes: 93.56, ig_avg_comments: 7.30, ig_eng: 0.0028, ig_posts: 14, fb_follower: 35000, fb_avg_likes: 17.20, fb_avg_comments: 0.00, fb_eng: 0.0005, fb_posts: 12, tt_follower: 61000, tt_avg_likes: 85.18, tt_avg_comments: 11.50, tt_eng: 0.0267, tt_posts: 11, quelle: 'Excel 16.01-15.02.2026' },
  { name: 'Rose Bikes', typ: 'netzwerk', ig_follower: 124000, ig_avg_likes: 1420.00, ig_avg_comments: 48.00, ig_eng: 0.0118, ig_posts: 22, fb_follower: 196000, fb_avg_likes: 320.00, fb_avg_comments: 18.00, fb_eng: 0.0017, fb_posts: 8, tt_follower: 48000, tt_avg_likes: 2400.00, tt_avg_comments: 84.00, tt_eng: 0.0510, tt_posts: 14, quelle: 'Socialblade' },
  { name: 'Canyon', typ: 'brand', ig_follower: 820000, ig_avg_likes: 12400.00, ig_avg_comments: 380.00, ig_eng: 0.0380, ig_posts: 28, fb_follower: 1200000, fb_avg_likes: 4200.00, fb_avg_comments: 140.00, fb_eng: 0.0035, fb_posts: 12, tt_follower: 340000, tt_avg_likes: 80000.00, tt_avg_comments: 2400.00, tt_eng: 0.0520, tt_posts: 18, quelle: 'Socialblade' },
];

const TAGS = [
  {kategorie:'standort',wert:'Muenster'},{kategorie:'standort',wert:'Grafrath'},{kategorie:'standort',wert:'Muenchen City'},
  {kategorie:'standort',wert:'Augsburg'},{kategorie:'standort',wert:'Starnberg'},{kategorie:'standort',wert:'Witten'},{kategorie:'standort',wert:'Rottweil'},
  {kategorie:'marke',wert:'Trek'},{kategorie:'marke',wert:'Specialized'},{kategorie:'marke',wert:'Canyon'},{kategorie:'marke',wert:'Cube'},{kategorie:'marke',wert:'Scott'},{kategorie:'marke',wert:'Giant'},
  {kategorie:'thema',wert:'E-Bike'},{kategorie:'thema',wert:'Werkstatt'},{kategorie:'thema',wert:'Beratung'},{kategorie:'thema',wert:'MTB & Gravel'},
  {kategorie:'thema',wert:'City'},{kategorie:'thema',wert:'Humor'},{kategorie:'thema',wert:'Lifestyle'},{kategorie:'thema',wert:'Sicherheit'},
  {kategorie:'kanal',wert:'Instagram'},{kategorie:'kanal',wert:'TikTok'},{kategorie:'kanal',wert:'YouTube'},{kategorie:'kanal',wert:'Facebook'},{kategorie:'kanal',wert:'LinkedIn'},
];

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const results: Record<string, unknown> = {};

  // Run DDL via pg RPC
  const { error: ddlError } = await supabaseAdmin.rpc('run_sql', { sql }).catch(() => ({ error: 'rpc not available' }));
  
  // Fallback: try direct postgres
  try {
    // Execute each statement individually via pg
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 10);
    for (const stmt of statements) {
      await supabaseAdmin.rpc('exec', { statement: stmt }).catch(() => {});
    }
  } catch(e) {}

  // Check if tables exist now
  const { data: postsCheck } = await supabaseAdmin.from('scompler_posts').select('id').limit(1);
  const { data: wettCheck } = await supabaseAdmin.from('scompler_wettbewerber').select('id').limit(1);
  const { data: tagsCheck } = await supabaseAdmin.from('scompler_tags').select('id').limit(1);

  results.tables = {
    scompler_posts: postsCheck !== null,
    scompler_wettbewerber: wettCheck !== null,
    scompler_tags: tagsCheck !== null,
  };

  // Seed wettbewerber
  if (wettCheck !== null) {
    const { data, error } = await supabaseAdmin
      .from('scompler_wettbewerber')
      .upsert(WETTBEWERBER, { onConflict: 'name' });
    results.wettbewerber = error ? `Fehler: ${error.message}` : `${WETTBEWERBER.length} eingetragen`;
  }

  // Seed tags
  if (tagsCheck !== null) {
    const { data, error } = await supabaseAdmin
      .from('scompler_tags')
      .upsert(TAGS, { onConflict: 'kategorie,wert' });
    results.tags = error ? `Fehler: ${error.message}` : `${TAGS.length} eingetragen`;
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
});
