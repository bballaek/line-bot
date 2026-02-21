-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_group_id TEXT UNIQUE NOT NULL,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  notify_time TEXT DEFAULT '19:00',
  notify_days JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create homeworks table
CREATE TABLE public.homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_homeworks table
CREATE TABLE public.user_homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  homework_id UUID REFERENCES public.homeworks(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' or 'done'
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, homework_id)
);

-- Enable Row Level Security (RLS) and Set Policies (Examples for development)
-- In a real app, you would tailor these strictly for user identity linked to LINE login,
-- but for now we'll allow anon access if configured, or authenticated via Supabase auth later.
