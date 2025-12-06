-- Ensure unique constraint on subscriptions.user_id and proper RLS so users can read their own subscription

-- 1) Add unique constraint on user_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    JOIN   pg_namespace n ON n.oid = t.relnamespace
    WHERE  c.contype = 'u'
    AND    t.relname = 'subscriptions'
    AND    n.nspname = 'public'
    AND    c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = t.oid AND attname = 'user_id')]
  ) THEN
    ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2) Create index on user_id for fast lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

-- 3) Enable RLS and allow users to read their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies with same names to avoid duplicates (safe if don't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Users can view their own subscription'
  ) THEN
    DROP POLICY "Users can view their own subscription" ON public.subscriptions;
  END IF;
END $$;

-- Create SELECT policy so authenticated users can read their own row
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);
