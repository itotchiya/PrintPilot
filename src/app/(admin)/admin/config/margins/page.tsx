"use client";

import { useConfigData } from "@/hooks/useConfigData";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import { KeyValueEditor } from "@/components/admin/KeyValueEditor";
import { useCallback } from "react";

interface MarginsItem {
  id: string;
  key: string;
  value: number;
  unit?: string | null;
  description?: string | null;
}

export default function MarginsConfigPage() {
  const { data, isLoading, update } = useConfigData<MarginsItem>("margins");

  const handleSave = useCallback(
    async (id: string, value: number) => {
      const item = data.find((d) => d.id === id);
      if (!item) return;
      await update({ id, key: item.key, value });
    },
    [data, update],
  );

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Marges"
        description="Pourcentages appliqués aux prix calculés"
        itemCount={data.length}
      />
      <KeyValueEditor
        items={data}
        onSave={handleSave}
        isLoading={isLoading}
        title="Paramètres marges"
        description="Cliquez sur une valeur pour la modifier"
      />
    </div>
  );
}
