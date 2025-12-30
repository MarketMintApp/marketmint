// app/pdf/success/page.tsx
import { Suspense } from "react";
import PdfSuccessClient from "../PdfSuccessClient";

export const dynamic = "force-dynamic";

function LoadingShell() {
  return (
    <main className="min-h-[80vh] bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
          <div className="h-6 w-40 rounded bg-slate-800/60" />
          <div className="mt-4 h-10 w-3/4 rounded bg-slate-800/60" />
          <div className="mt-3 h-4 w-2/3 rounded bg-slate-800/60" />
          <div className="mt-6 h-12 w-full rounded bg-slate-800/60" />
        </div>
      </div>
    </main>
  );
}

export default function PdfSuccessPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <PdfSuccessClient />
    </Suspense>
  );
}
