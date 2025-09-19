-- Fix org creation for main app integration
-- This migration ensures orgs can be created without initial members

-- Check if the org already exists before creating
DO $$
BEGIN
  -- Create the default org for main app if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.orgs WHERE id = 'a1111111-1111-1111-1111-111111111111'
  ) THEN
    INSERT INTO public.orgs (id, name, created_at)
    VALUES ('a1111111-1111-1111-1111-111111111111', 'ForhandlerPRO Main', NOW());
  END IF;
END $$;