'use client';

import { DEFAULT_PATH } from '@/constant'

import { createClient } from '@/utils/supabase/client';
import { type Provider } from '@supabase/supabase-js';

export async function signInWithOAuth(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);

  const provider = String(formData.get('provider')).trim() as Provider;

  const supabase = createClient();

  const redirectURL = `${DEFAULT_PATH}/auth/callback`;

  await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: redirectURL
    }
  });
}