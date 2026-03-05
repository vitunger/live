-- scompler_posts
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

-- scompler_wettbewerber
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

-- scompler_tags
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

-- modul_status
INSERT INTO public.modul_status (modul_key, status, name, beschreibung)
VALUES ('scompler', 'aktiv', 'Scompler', 'Social Media Intelligence')
ON CONFLICT (modul_key) DO NOTHING;
