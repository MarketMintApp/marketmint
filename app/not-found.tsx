// app/not-found.tsx
import { Suspense } from "react";
import NotFoundClient from "./not-found-client";

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50">
          <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        </main>
      }
    >
      <NotFoundClient />
    </Suspense>
  );
}
