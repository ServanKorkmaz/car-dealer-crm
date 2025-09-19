import { supabase } from './lib/supabaseClient';

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const user = data.user;
  if (user) {
    const { error: pErr } = await supabase.from('profiles').insert({
      user_id: user.id,
      full_name: fullName || null
    });
    if (pErr && pErr.code !== '23505') throw pErr;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}