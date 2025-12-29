import { Suspense } from "react";
import PdfSuccessClient from "../PdfSuccessClient";

export const dynamic = "force-dynamic";

export default function PdfSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[70vh] mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-slate-50">
            <div className="h-4 w-40 rounded bg-slate-800/60" />
            <div className="mt-4 h-8 w-3/4 rounded bg-slate-800/60" />
            <div className="mt-3 h-4 w-2/3 rounded bg-slate-800/60" />
          </div>
        </main>
      }
    >
      <PdfSuccessClient />
    </Suspense>
  );
}
