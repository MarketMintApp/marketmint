"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type HeaderStats = {
  items: number;
  offers: number;
  loading: boolean;
};

function isActivePath(pathname: string, target: string) {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<HeaderStats>({
    items: 0,
    offers: 0,
    loading: true,
  });

  // --- Load session + user-scoped stats (safe when logged out) ---
  useEffect(() => {
    let cancelled = false;

    async function loadForUser(userId: string, email: string | null) {
      if (cancelled) return;

      setUserEmail(email);
      setStats((s) => ({ ...s, loading: true }));

      try {
        const [valsRes, offsRes] = await Promise.all([
          supabase
            .from("valuations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

        if (cancelled) return;

        setStats({
          items: valsRes.count ?? 0,
          offers: offsRes.count ?? 0,
          loading: false,
        });
      } catch (e) {
        console.error("Header stats load error:", e);
        if (!cancelled) setStats((s) => ({ ...s, loading: false }));
      }
    }

    function setLoggedOutState() {
      if (cancelled) return;
      setUserEmail(null);
      setStats({ items: 0, offers: 0, loading: false });
    }

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setLoggedOutState();
          return;
        }

        const user = data.session?.user ?? null;
        if (!user) {
          setLoggedOutState();
          return;
        }

        await loadForUser(user.id, user.email ?? null);
      } catch (e) {
        console.error("Header init error:", e);
        setLoggedOutState();
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      if (!user) {
        setLoggedOutState();
        return;
      }

      loadForUser(user.id, user.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  function navClass(path: string) {
    const active = isActivePath(pathname, path);
    return `
      px-3 py-1.5 rounded-full text-sm transition font-medium
      ${active ? "bg-emerald-600/20 text-emerald-300" : "text-slate-300"}
      hover:bg-emerald-600/10 hover:text-emerald-300
    `;
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-500/60 bg-emerald-500/10 text-[12px] font-semibold text-emerald-300">
            MM
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            MarketMint
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden gap-2 sm:flex">
          <Link href="/value" className={navClass("/value")}>
            Workspace
          </Link>
          <Link href="/prices" className={navClass("/prices")}>
            Prices
          </Link>
          <Link href="/gold" className={navClass("/gold")}>
            Gold Calc
          </Link>
          <Link href="/items" className={navClass("/items")}>
            My Items
          </Link>
          <Link href="/offers" className={navClass("/offers")}>
            Offers
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              {/* Items + Offers Tracker */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300">
                <div className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                  Items:{" "}
                  <span className="font-semibold text-white">
                    {stats.loading ? "…" : stats.items}
                  </span>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                  Offers:{" "}
                  <span className="font-semibold text-white">
                    {stats.loading ? "…" : stats.offers}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="text-xs rounded-full px-3 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="hidden sm:block text-[11px] text-slate-400">
                You're viewing demo mode.
              </p>
              <Link
                href="/login"
                className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Log in / Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
