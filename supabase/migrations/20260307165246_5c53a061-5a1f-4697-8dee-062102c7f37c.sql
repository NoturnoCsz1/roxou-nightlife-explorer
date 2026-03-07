
-- Create partners table
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'bar',
  address TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL DEFAULT 'Presidente Prudente',
  instagram TEXT,
  whatsapp TEXT,
  short_description TEXT,
  full_description TEXT,
  logo_url TEXT,
  verified_partner BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL DEFAULT 'festa',
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  venue_name TEXT,
  address TEXT,
  instagram TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  verification_source TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page_views table for analytics
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  device_type TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visitor_sessions table
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_type TEXT,
  city TEXT,
  region TEXT,
  country TEXT
);

-- Create indexes
CREATE INDEX idx_events_partner_id ON public.events(partner_id);
CREATE INDEX idx_events_date_time ON public.events(date_time);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_partners_active ON public.partners(active);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);
CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);

-- Enable RLS on all tables
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Partners: public read for active, authenticated full access
CREATE POLICY "Anyone can view active partners" ON public.partners
  FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can manage partners" ON public.partners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Events: public read for published, authenticated full access
CREATE POLICY "Anyone can view published events" ON public.events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated users can manage events" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Page views: anyone can insert, authenticated can read
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read page views" ON public.page_views
  FOR SELECT TO authenticated USING (true);

-- Visitor sessions: anyone can insert/update, authenticated can read
CREATE POLICY "Anyone can upsert visitor sessions" ON public.visitor_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update visitor sessions" ON public.visitor_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read visitor sessions" ON public.visitor_sessions
  FOR SELECT TO authenticated USING (true);
