"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProWaitlistForm() {
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Add an email to join the waitlist.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("waitlist").insert([
        {
          email: trimmed,
          use_case: useCase.trim() || null,
        },
      ]);

      if (error) {
        console.error("Error adding to waitlist:", error);
        setError("Something went wrong. Please try again.");
        return;
      }

      setSuccess("You're on the list! I’ll email you when Pro is ready.");
      setEmail("");
      setUseCase("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-3 text-sm md:flex-row md:items-center"
    >
      <div className="flex-1 space-y-1">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-9 w-full rounded-md border border-emerald-500/60 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-300"
        />
        <input
          type="text"
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          placeholder="Optional: how would you use Pro?"
          className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-emerald-300"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-9 min-w-[170px] rounded-full bg-emerald-600/90 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Joining…" : "Join Pro waitlist"}
      </button>

      {(success || error) && (
        <p className={`text-xs md:w-56 ${success ? "text-emerald-200" : "text-rose-300"}`}>
          {success || error}
        </p>
      )}
    </form>
  );
}
