"use client";

import { useConfigData } from "@/hooks/useConfigData";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import { KeyValueEditor } from "@/components/admin/KeyValueEditor";
import { useCallback } from "react";

interface DigitalItem {
  id: string;
  key: string;
  value: number;
  unit?: string | null;
  description?: string | null;
}

export default function DigitalConfigPage() {
  const { data, isLoading, update } = useConfigData<DigitalItem>("digital");

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
        title="Coûts Numérique"
        description="Paramètres de calcul pour l'impression numérique"
        itemCount={data.length}
      />
      <KeyValueEditor
        items={data}
        onSave={handleSave}
        isLoading={isLoading}
        title="Paramètres numérique"
        description="Cliquez sur une valeur pour la modifier"
      />
    </div>
  );
}
