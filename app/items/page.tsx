// app/items/page.tsx
import { Suspense } from "react";
import ItemsClient from "./items-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ItemsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <p className="text-sm text-slate-300">Loading…</p>
          </div>
        </main>
      }
    >
      <ItemsClient />
    </Suspense>
  );
}
