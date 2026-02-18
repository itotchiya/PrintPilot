"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export function useConfigData<T>(category: string) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/config/${category}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(
    async (body: Partial<T>) => {
      const res = await fetch(`/api/admin/config/${category}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de création");
      }
      toast.success("Élément créé");
      await fetchData();
      return res.json();
    },
    [category, fetchData],
  );

  const update = useCallback(
    async (body: Partial<T> & { id?: string }) => {
      const res = await fetch(`/api/admin/config/${category}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de mise à jour");
      }
      toast.success("Modifications enregistrées");
      await fetchData();
      return res.json();
    },
    [category, fetchData],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/config/${category}?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de suppression");
      }
      toast.success("Élément supprimé");
      await fetchData();
    },
    [category, fetchData],
  );

  return { data, isLoading, refetch: fetchData, create, update, remove };
}
