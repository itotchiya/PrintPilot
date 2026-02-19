"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useConfigData } from "@/hooks/useConfigData";

interface BindingPriceTier {
  id: string;
  bindingTypeId: string;
  pageRangeMin: number;
  pageRangeMax: number;
  qtyMin: number;
  qtyMax: number;
  perUnitCost: number;
  setupCost: number;
}

interface BindingType {
  id: string;
  name: string;
  minPages: number;
  maxPages: number | null;
  active: boolean;
  digitalPriceTiers: BindingPriceTier[];
}

type BindingTypeRow = BindingType & Record<string, unknown>;
type TierRow = BindingPriceTier & Record<string, unknown>;

const EMPTY_BINDING: Omit<BindingType, "id" | "digitalPriceTiers"> = {
  name: "",
  minPages: 0,
  maxPages: null,
  active: true,
};

const EMPTY_TIER: Omit<
  BindingPriceTier,
  "id" | "bindingTypeId"
> = {
  pageRangeMin: 0,
  pageRangeMax: 0,
  qtyMin: 0,
  qtyMax: 0,
  perUnitCost: 0,
  setupCost: 0,
};

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

export default function FinishingConfigPage() {
  const { data, isLoading, refetch, create, update, remove } =
    useConfigData<BindingType>("binding");

  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<BindingType | null>(null);
  const [bindingForm, setBindingForm] = useState(EMPTY_BINDING);
  const [isSubmittingBinding, setIsSubmittingBinding] = useState(false);

  const [deletingBinding, setDeletingBinding] = useState<BindingType | null>(null);
  const [isDeletingBinding, setIsDeletingBinding] = useState(false);

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<BindingPriceTier | null>(null);
  const [tierForm, setTierForm] = useState(EMPTY_TIER);
  const [tierBindingTypeId, setTierBindingTypeId] = useState<string | null>(null);
  const [isSubmittingTier, setIsSubmittingTier] = useState(false);

  const [deletingTier, setDeletingTier] = useState<{
    id: string;
    bindingTypeId: string;
  } | null>(null);
  const [isDeletingTier, setIsDeletingTier] = useState(false);

  const [activeTab, setActiveTab] = useState("types");

  const openAddBinding = () => {
    setEditingBinding(null);
    setBindingForm(EMPTY_BINDING);
    setBindingDialogOpen(true);
  };

  const openEditBinding = (bt: BindingType) => {
    setEditingBinding(bt);
    setBindingForm({
      name: bt.name,
      minPages: bt.minPages,
      maxPages: bt.maxPages,
      active: bt.active,
    });
    setBindingDialogOpen(true);
  };

  const handleBindingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBinding(true);
    try {
      const payload = {
        ...bindingForm,
        maxPages: bindingForm.maxPages == null ? null : Number(bindingForm.maxPages),
      };
      if (editingBinding) {
        await update({ id: editingBinding.id, ...payload });
      } else {
        await create(payload);
      }
      setBindingDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingBinding(false);
    }
  };

  const handleDeleteBinding = async () => {
    if (!deletingBinding) return;
    setIsDeletingBinding(true);
    try {
      await remove(deletingBinding.id);
      setDeletingBinding(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingBinding(false);
    }
  };

  const openAddTier = (bindingTypeId: string) => {
    setEditingTier(null);
    setTierForm(EMPTY_TIER);
    setTierBindingTypeId(bindingTypeId);
    setTierDialogOpen(true);
  };

  const openEditTier = (tier: BindingPriceTier) => {
    setEditingTier(tier);
    setTierForm({
      pageRangeMin: toNum(tier.pageRangeMin),
      pageRangeMax: toNum(tier.pageRangeMax),
      qtyMin: toNum(tier.qtyMin),
      qtyMax: toNum(tier.qtyMax),
      perUnitCost: toNum(tier.perUnitCost),
      setupCost: toNum(tier.setupCost),
    });
    setTierBindingTypeId(tier.bindingTypeId);
    setTierDialogOpen(true);
  };

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierBindingTypeId) return;
    setIsSubmittingTier(true);
    try {
      const url = `/api/admin/config/binding/${tierBindingTypeId}/tiers`;
      const body = editingTier
        ? { id: editingTier.id, ...tierForm }
        : tierForm;
      const res = await fetch(url, {
        method: editingTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingTier ? "Tarif mis à jour" : "Tarif créé");
      await refetch();
      setTierDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingTier(false);
    }
  };

  const handleDeleteTier = useCallback(async () => {
    if (!deletingTier) return;
    setIsDeletingTier(true);
    try {
      const res = await fetch(
        `/api/admin/config/binding/${deletingTier.bindingTypeId}/tiers?id=${deletingTier.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de suppression");
      }
      toast.success("Tarif supprimé");
      await refetch();
      setDeletingTier(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingTier(false);
    }
  }, [deletingTier, refetch]);

  const bindingColumns: ColumnDef<BindingTypeRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    {
      key: "minPages",
      header: "Pages min",
      cell: (item) => item.minPages,
    },
    {
      key: "maxPages",
      header: "Pages max",
      cell: (item) => (item.maxPages == null ? "∞" : item.maxPages),
    },
    {
      key: "active",
      header: "Statut",
      cell: (item) => <StatusBadge active={item.active} />,
    },
    {
      key: "tiersCount",
      header: "Tarifs",
      cell: (item) =>
        `${(item.digitalPriceTiers?.length ?? 0)} tarifs`,
    },
    {
      key: "actions",
      header: "",
      className: "w-[160px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab(item.id)}
            title="Voir les tarifs"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openAddTier(item.id)}
            title="Ajouter un tarif"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditBinding(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingBinding(item)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const tierColumns = (bindingTypeId: string): ColumnDef<TierRow>[] => [
    {
      key: "pageRange",
      header: "Pages",
      cell: (item) => `${item.pageRangeMin}-${item.pageRangeMax}`,
    },
    {
      key: "qtyRange",
      header: "Quantité",
      cell: (item) => `${item.qtyMin}-${item.qtyMax}`,
    },
    {
      key: "perUnitCost",
      header: "Coût/unité €",
      cell: (item) => toNum(item.perUnitCost).toFixed(2),
    },
    {
      key: "setupCost",
      header: "Mise en route €",
      cell: (item) => toNum(item.setupCost).toFixed(2),
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditTier(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setDeletingTier({ id: item.id, bindingTypeId })
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const bindings = (data as BindingType[]) ?? [];

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Façonnage / Reliure"
        description="Types de reliure et tarifs associés"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="types">Types de reliure</TabsTrigger>
          {bindings
            .filter((bt) => (bt.digitalPriceTiers?.length ?? 0) > 0)
            .map((bt) => (
            <TabsTrigger key={bt.id} value={bt.id}>
              {bt.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <ConfigDataTable<BindingTypeRow>
            data={bindings as BindingTypeRow[]}
            columns={bindingColumns}
            searchField="name"
            searchPlaceholder="Rechercher un type de reliure…"
            onAdd={openAddBinding}
            addLabel="Ajouter un type"
            isLoading={isLoading}
          />
        </TabsContent>

        {bindings
          .filter((bt) => (bt.digitalPriceTiers?.length ?? 0) > 0)
          .map((bt) => (
            <TabsContent key={bt.id} value={bt.id} className="mt-4">
              <ConfigDataTable<TierRow>
                data={(bt.digitalPriceTiers ?? []) as TierRow[]}
                columns={tierColumns(bt.id)}
                onAdd={() => openAddTier(bt.id)}
                addLabel="Ajouter un tarif"
                isLoading={isLoading}
              />
            </TabsContent>
          ))}
      </Tabs>

      {/* Binding type add/edit dialog */}
      <ConfigDialog
        open={bindingDialogOpen}
        onOpenChange={setBindingDialogOpen}
        title={
          editingBinding
            ? "Modifier le type de reliure"
            : "Ajouter un type de reliure"
        }
        onSubmit={handleBindingSubmit}
        onCancel={() => setBindingDialogOpen(false)}
        isSubmitting={isSubmittingBinding}
      >
        <div className="space-y-2">
          <Label htmlFor="binding-name">Nom</Label>
          <Input
            id="binding-name"
            value={bindingForm.name}
            onChange={(e) =>
              setBindingForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="binding-minPages">Pages min</Label>
          <Input
            id="binding-minPages"
            type="number"
            min={0}
            value={bindingForm.minPages || ""}
            onChange={(e) =>
              setBindingForm((f) => ({
                ...f,
                minPages: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="binding-maxPages">Pages max (optionnel, vide = ∞)</Label>
          <Input
            id="binding-maxPages"
            type="number"
            min={0}
            value={bindingForm.maxPages ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBindingForm((f) => ({
                ...f,
                maxPages: v === "" ? null : (parseInt(v) || 0),
              }));
            }}
            placeholder="∞"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="binding-active"
            checked={bindingForm.active}
            onCheckedChange={(checked) =>
              setBindingForm((f) => ({ ...f, active: checked }))
            }
          />
          <Label htmlFor="binding-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Tier add/edit dialog */}
      <ConfigDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        title={editingTier ? "Modifier le tarif" : "Ajouter un tarif"}
        onSubmit={handleTierSubmit}
        onCancel={() => setTierDialogOpen(false)}
        isSubmitting={isSubmittingTier}
      >
        <div className="space-y-2">
          <Label htmlFor="tier-pageMin">Pages min</Label>
          <Input
            id="tier-pageMin"
            type="number"
            min={0}
            value={tierForm.pageRangeMin || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                pageRangeMin: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier-pageMax">Pages max</Label>
          <Input
            id="tier-pageMax"
            type="number"
            min={0}
            value={tierForm.pageRangeMax || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                pageRangeMax: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier-qtyMin">Quantité min</Label>
          <Input
            id="tier-qtyMin"
            type="number"
            min={0}
            value={tierForm.qtyMin || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                qtyMin: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier-qtyMax">Quantité max</Label>
          <Input
            id="tier-qtyMax"
            type="number"
            min={0}
            value={tierForm.qtyMax || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                qtyMax: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier-perUnit">Coût/unité (€)</Label>
          <Input
            id="tier-perUnit"
            type="number"
            step={0.01}
            min={0}
            value={tierForm.perUnitCost || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                perUnitCost: parseFloat(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier-setup">Mise en route (€)</Label>
          <Input
            id="tier-setup"
            type="number"
            step={0.01}
            min={0}
            value={tierForm.setupCost || ""}
            onChange={(e) =>
              setTierForm((f) => ({
                ...f,
                setupCost: parseFloat(e.target.value) || 0,
              }))
            }
            required
          />
        </div>
      </ConfigDialog>

      <DeleteConfirmDialog
        open={!!deletingBinding}
        onOpenChange={(open) => !open && setDeletingBinding(null)}
        onConfirm={handleDeleteBinding}
        title="Supprimer le type de reliure"
        description={`Supprimer « ${deletingBinding?.name} » et tous ses tarifs ? Cette action est irréversible.`}
        isDeleting={isDeletingBinding}
      />

      <DeleteConfirmDialog
        open={!!deletingTier}
        onOpenChange={(open) => !open && setDeletingTier(null)}
        onConfirm={handleDeleteTier}
        title="Supprimer le tarif"
        description="Voulez-vous supprimer ce tarif ? Cette action est irréversible."
        isDeleting={isDeletingTier}
      />
    </div>
  );
}
