// path: app/login/page.tsx
"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { gaEvent } from "../lib/ga";

function safeRedirectPath(input: string | null, fallback: string) {
  if (!input) return fallback;
  // Only allow internal paths like "/value" or "/offers?x=1"
  if (!input.startsWith("/")) return fallback;
  // Block protocol-like or double-slash weirdness
  if (input.startsWith("//")) return fallback;
  return input;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    return safeRedirectPath(searchParams.get("redirect"), "/value");
  }, [searchParams]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }

        // GA: login completed (client-only)
        gaEvent("login_completed", {
          method: "password",
          redirect_to: redirectTo,
          user_id: data?.user?.id ?? null,
        });

        router.push(redirectTo);
        return;
      }

      // ---- SIGNUP ----
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = origin ? `${origin}${redirectTo}` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // GA: signup completed (account created)
      // Fires whether email confirmation is ON or OFF.
      gaEvent("signup_completed", {
        method: "password",
        redirect_to: redirectTo,
        requires_email_confirmation: data?.session ? false : true,
        user_id: data?.user?.id ?? null,
      });

      // If email confirmation is OFF, Supabase will give us a session here
      if (data.session) {
        router.push(redirectTo);
        return;
      }

      // If email confirmation is ON, there is no session yet
      setInfoMessage(
        "Account created. Please check your email to confirm your address, then log in."
      );
      setMode("login");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-2xl font-semibold text-center mb-1">
          {mode === "login" ? "Log in to MarketMint" : "Create your MarketMint account"}
        </h1>
        <p className="text-xs text-slate-400 text-center mb-4">
          Save valuations, track offers, and never get lowballed again.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
            />
          </div>

          {error && <p className="text-xs text-rose-400 whitespace-pre-line">{error}</p>}
          {infoMessage && (
            <p className="text-xs text-emerald-300 whitespace-pre-line">{infoMessage}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-full bg-emerald-600/90 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting
              ? mode === "login"
                ? "Logging in…"
                : "Creating account…"
              : mode === "login"
              ? "Log in"
              : "Sign up"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
              >
                Log in
              </button>
            </>
          )}
        </div>

        <div className="mt-3 text-center text-xs">
          <Link
            href="/value"
            className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Continue in demo mode →
          </Link>
        </div>
      </div>
    </main>
  );
}
