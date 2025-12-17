// app/lib/useAuthGuard.ts
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type AuthGuardResult = {
  user: User | null;
  authChecked: boolean;
  demoMode: boolean;
  error: string | null;
};

function isSessionMissingError(err: unknown) {
  const msg = (err as any)?.message || "";
  return (
    msg.includes("Auth session missing") || msg.includes("AuthSessionMissingError")
  );
}

export function useAuthGuard(): AuthGuardResult {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applyLoggedOut() {
      if (cancelled) return;
      setUser(null);
      setDemoMode(true);
      setAuthChecked(true);
      setError(null);
    }

    function applyLoggedIn(u: User) {
      if (cancelled) return;
      setUser(u);
      setDemoMode(false);
      setAuthChecked(true);
      setError(null);
    }

    async function checkAuthOnce() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (authError) {
          if (isSessionMissingError(authError)) {
            applyLoggedOut();
            return;
          }
          console.error("Error checking auth:", authError);
          if (!cancelled) {
            setError("There was a problem checking your session.");
            setAuthChecked(true);
          }
          return;
        }

        if (!data.user) {
          applyLoggedOut();
          return;
        }

        applyLoggedIn(data.user);
      } catch (err) {
        console.error("Unexpected error checking auth:", err);
        if (isSessionMissingError(err)) {
          applyLoggedOut();
          return;
        }
        if (!cancelled) {
          setError("There was a problem checking your session.");
          setAuthChecked(true);
        }
      }
    }

    // 1) Initial check (covers hard refresh / first load)
    checkAuthOnce();

    // 2) Live updates (covers login/logout without refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (!u) applyLoggedOut();
      else applyLoggedIn(u);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, authChecked, demoMode, error };
}
