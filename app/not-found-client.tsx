// app/not-found-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NotFoundClient() {
  const sp = useSearchParams();
  const from = sp.get("from"); // example usage

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      {from ? <p className="mt-2 text-slate-300">Came from: {from}</p> : null}
      <Link className="mt-6 inline-block underline text-slate-300" href="/">
        Go home
      </Link>
    </main>
  );
}
