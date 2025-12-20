// app/offers/page.tsx
import { Suspense } from "react";
import OffersClient from "./offers-client";

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50">
          <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
            <p className="text-sm text-slate-400">Loading offers…</p>
          </div>
        </main>
      }
    >
      <OffersClient />
    </Suspense>
  );
}
