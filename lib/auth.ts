// lib/auth.ts
// Email + password auth. Signup does NOT send a verification email as long
// as "Confirm email" is turned off in the Supabase dashboard (Authentication
// → Providers → Email → toggle off "Confirm email") — that's a project
// setting enforced server-side by Supabase, not something this code can
// control. With it off, signUpWithPassword() logs the teacher in
// immediately, no email involved. The only email in this whole flow is the
// password-reset link, which is the appropriate place for one.

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
  });
  if (error) throw new Error(error.message);
}

/** Called on the /reset-password landing page, after the teacher clicks the
 * link from requestPasswordReset(). By that point Supabase has already
 * established a temporary "recovery" session from the link's token, so this
 * just sets the new password on that session. */
export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

/** Reactive current-user hook. Returns null while loading OR when signed
 * out — components that need to distinguish those two states should also
 * check `loading`. */
export function useCurrentUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
