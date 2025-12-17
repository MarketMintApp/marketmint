// app/not-found.tsx
import { Suspense } from "react";
import NotFoundClient from "./not-found-client";

export default function NotFound() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-50 p-6">Loading…</div>}>
      <NotFoundClient />
    </Suspense>
  );
}
