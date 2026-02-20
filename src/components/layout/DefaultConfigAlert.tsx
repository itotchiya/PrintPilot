"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Info } from "lucide-react";

export function DefaultConfigAlert() {
  const { data: session, status } = useSession();
  const [configCustomizedAt, setConfigCustomizedAt] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "FOURNISSEUR") return;

    let cancelled = false;
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : { configCustomizedAt: null }))
      .then((data: { configCustomizedAt?: string | null }) => {
        if (!cancelled) setConfigCustomizedAt(data.configCustomizedAt ?? null);
      })
      .catch(() => {
        if (!cancelled) setConfigCustomizedAt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.user]);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "FOURNISSEUR") return;
    const onFocus = () => {
      fetch("/api/user/me")
        .then((res) => (res.ok ? res.json() : {}))
        .then((data: { configCustomizedAt?: string | null }) =>
          setConfigCustomizedAt((prev) => (prev === undefined ? prev : data.configCustomizedAt ?? null))
        )
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session?.user]);

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (status !== "authenticated" || role !== "FOURNISSEUR") return null;
  if (configCustomizedAt === undefined) return null; // loading
  if (configCustomizedAt !== null) return null; // already customized

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm">
        Ceci est la configuration démo par défaut. Personnalisez-la dans les onglets ci-dessous pour l’adapter à votre activité.
      </p>
    </div>
  );
}
