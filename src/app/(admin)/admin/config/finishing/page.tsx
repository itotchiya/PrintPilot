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

interface BindingPriceTierOffset {
  id: string;
  bindingTypeId: string;
  cahiersCount: number;
  calageCost: number;
  roulagePer1000: number;
}

interface BindingType {
  id: string;
  name: string;
  minPages: number;
  maxPages: number | null;
  active: boolean;
  digitalPriceTiers: BindingPriceTier[];
  offsetPriceTiers: BindingPriceTierOffset[];
}

type BindingTypeRow = BindingType & Record<string, unknown>;
type TierRow = BindingPriceTier & Record<string, unknown>;
type OffsetTierRow = BindingPriceTierOffset & Record<string, unknown>;

const EMPTY_BINDING: Omit<BindingType, "id" | "digitalPriceTiers" | "offsetPriceTiers"> = {
  name: "",
  minPages: 0,
  maxPages: null,
  active: true,
};

const EMPTY_DIGITAL_TIER: Omit<BindingPriceTier, "id" | "bindingTypeId"> = {
  pageRangeMin: 0,
  pageRangeMax: 0,
  qtyMin: 0,
  qtyMax: 0,
  perUnitCost: 0,
  setupCost: 0,
};

const EMPTY_OFFSET_TIER: Omit<BindingPriceTierOffset, "id" | "bindingTypeId"> = {
  cahiersCount: 1,
  calageCost: 0,
  roulagePer1000: 0,
};

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

export default function FinishingConfigPage() {
  const { data, isLoading, refetch, create, update, remove } =
    useConfigData<BindingType>("binding");

  // ── Binding type CRUD ─────────────────────────────────────────────────────
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<BindingType | null>(null);
  const [bindingForm, setBindingForm] = useState(EMPTY_BINDING);
  const [isSubmittingBinding, setIsSubmittingBinding] = useState(false);
  const [deletingBinding, setDeletingBinding] = useState<BindingType | null>(null);
  const [isDeletingBinding, setIsDeletingBinding] = useState(false);

  // ── Digital tier CRUD ─────────────────────────────────────────────────────
  const [digitalTierDialogOpen, setDigitalTierDialogOpen] = useState(false);
  const [editingDigitalTier, setEditingDigitalTier] = useState<BindingPriceTier | null>(null);
  const [digitalTierForm, setDigitalTierForm] = useState(EMPTY_DIGITAL_TIER);
  const [digitalTierBindingTypeId, setDigitalTierBindingTypeId] = useState<string | null>(null);
  const [isSubmittingDigitalTier, setIsSubmittingDigitalTier] = useState(false);
  const [deletingDigitalTier, setDeletingDigitalTier] = useState<{
    id: string;
    bindingTypeId: string;
  } | null>(null);
  const [isDeletingDigitalTier, setIsDeletingDigitalTier] = useState(false);

  // ── Offset tier CRUD ──────────────────────────────────────────────────────
  const [offsetTierDialogOpen, setOffsetTierDialogOpen] = useState(false);
  const [editingOffsetTier, setEditingOffsetTier] = useState<BindingPriceTierOffset | null>(null);
  const [offsetTierForm, setOffsetTierForm] = useState(EMPTY_OFFSET_TIER);
  const [offsetTierBindingTypeId, setOffsetTierBindingTypeId] = useState<string | null>(null);
  const [isSubmittingOffsetTier, setIsSubmittingOffsetTier] = useState(false);
  const [deletingOffsetTier, setDeletingOffsetTier] = useState<{
    id: string;
    bindingTypeId: string;
  } | null>(null);
  const [isDeletingOffsetTier, setIsDeletingOffsetTier] = useState(false);

  // ── Sub-tab per binding type: "digital" | "offset" ────────────────────────
  const [bindingSubTabs, setBindingSubTabs] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState("types");

  // ── Binding type handlers ─────────────────────────────────────────────────
  const openAddBinding = () => {
    setEditingBinding(null);
    setBindingForm(EMPTY_BINDING);
    setBindingDialogOpen(true);
  };

  const openEditBinding = (bt: BindingType) => {
    setEditingBinding(bt);
    setBindingForm({ name: bt.name, minPages: bt.minPages, maxPages: bt.maxPages, active: bt.active });
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

  // ── Digital tier handlers ─────────────────────────────────────────────────
  const openAddDigitalTier = (bindingTypeId: string) => {
    setEditingDigitalTier(null);
    setDigitalTierForm(EMPTY_DIGITAL_TIER);
    setDigitalTierBindingTypeId(bindingTypeId);
    setDigitalTierDialogOpen(true);
  };

  const openEditDigitalTier = (tier: BindingPriceTier) => {
    setEditingDigitalTier(tier);
    setDigitalTierForm({
      pageRangeMin: toNum(tier.pageRangeMin),
      pageRangeMax: toNum(tier.pageRangeMax),
      qtyMin: toNum(tier.qtyMin),
      qtyMax: toNum(tier.qtyMax),
      perUnitCost: toNum(tier.perUnitCost),
      setupCost: toNum(tier.setupCost),
    });
    setDigitalTierBindingTypeId(tier.bindingTypeId);
    setDigitalTierDialogOpen(true);
  };

  const handleDigitalTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalTierBindingTypeId) return;
    setIsSubmittingDigitalTier(true);
    try {
      const url = `/api/admin/config/binding/${digitalTierBindingTypeId}/tiers`;
      const body = editingDigitalTier
        ? { id: editingDigitalTier.id, ...digitalTierForm }
        : digitalTierForm;
      const res = await fetch(url, {
        method: editingDigitalTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingDigitalTier ? "Tarif mis à jour" : "Tarif créé");
      await refetch();
      setDigitalTierDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingDigitalTier(false);
    }
  };

  const handleDeleteDigitalTier = useCallback(async () => {
    if (!deletingDigitalTier) return;
    setIsDeletingDigitalTier(true);
    try {
      const res = await fetch(
        `/api/admin/config/binding/${deletingDigitalTier.bindingTypeId}/tiers?id=${deletingDigitalTier.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de suppression");
      }
      toast.success("Tarif supprimé");
      await refetch();
      setDeletingDigitalTier(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingDigitalTier(false);
    }
  }, [deletingDigitalTier, refetch]);

  // ── Offset tier handlers ──────────────────────────────────────────────────
  const openAddOffsetTier = (bindingTypeId: string) => {
    setEditingOffsetTier(null);
    setOffsetTierForm(EMPTY_OFFSET_TIER);
    setOffsetTierBindingTypeId(bindingTypeId);
    setOffsetTierDialogOpen(true);
  };

  const openEditOffsetTier = (tier: BindingPriceTierOffset) => {
    setEditingOffsetTier(tier);
    setOffsetTierForm({
      cahiersCount: toNum(tier.cahiersCount),
      calageCost: toNum(tier.calageCost),
      roulagePer1000: toNum(tier.roulagePer1000),
    });
    setOffsetTierBindingTypeId(tier.bindingTypeId);
    setOffsetTierDialogOpen(true);
  };

  const handleOffsetTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offsetTierBindingTypeId) return;
    setIsSubmittingOffsetTier(true);
    try {
      const url = `/api/admin/config/binding/${offsetTierBindingTypeId}/offset-tiers`;
      const body = editingOffsetTier
        ? { id: editingOffsetTier.id, ...offsetTierForm }
        : offsetTierForm;
      const res = await fetch(url, {
        method: editingOffsetTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingOffsetTier ? "Tarif offset mis à jour" : "Tarif offset créé");
      await refetch();
      setOffsetTierDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingOffsetTier(false);
    }
  };

  const handleDeleteOffsetTier = useCallback(async () => {
    if (!deletingOffsetTier) return;
    setIsDeletingOffsetTier(true);
    try {
      const res = await fetch(
        `/api/admin/config/binding/${deletingOffsetTier.bindingTypeId}/offset-tiers?id=${deletingOffsetTier.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de suppression");
      }
      toast.success("Tarif offset supprimé");
      await refetch();
      setDeletingOffsetTier(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingOffsetTier(false);
    }
  }, [deletingOffsetTier, refetch]);

  // ── Column definitions ────────────────────────────────────────────────────
  const bindingColumns: ColumnDef<BindingTypeRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    { key: "minPages", header: "Pages min", cell: (item) => item.minPages },
    {
      key: "maxPages",
      header: "Pages max",
      cell: (item) => (item.maxPages == null ? "∞" : item.maxPages),
    },
    { key: "active", header: "Statut", cell: (item) => <StatusBadge active={item.active} /> },
    {
      key: "tiersCount",
      header: "Tarifs",
      cell: (item) =>
        `${item.digitalPriceTiers?.length ?? 0} num. / ${item.offsetPriceTiers?.length ?? 0} off.`,
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
            onClick={() => openAddDigitalTier(item.id)}
            title="Ajouter un tarif numérique"
          >
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEditBinding(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingBinding(item)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const digitalTierColumns = (bindingTypeId: string): ColumnDef<TierRow>[] => [
    { key: "pageRange", header: "Pages", cell: (item) => `${item.pageRangeMin}–${item.pageRangeMax}` },
    { key: "qtyRange", header: "Quantité", cell: (item) => `${item.qtyMin}–${item.qtyMax}` },
    { key: "perUnitCost", header: "Coût/unité €", cell: (item) => toNum(item.perUnitCost).toFixed(3) },
    { key: "setupCost", header: "Mise en route €", cell: (item) => toNum(item.setupCost).toFixed(2) },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditDigitalTier(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingDigitalTier({ id: item.id, bindingTypeId })}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const offsetTierColumns = (bindingTypeId: string): ColumnDef<OffsetTierRow>[] => [
    { key: "cahiersCount", header: "Cahiers", cell: (item) => toNum(item.cahiersCount) },
    { key: "calageCost", header: "Calage €", cell: (item) => toNum(item.calageCost).toFixed(2) },
    {
      key: "roulagePer1000",
      header: "Roulage / 1000 €",
      cell: (item) => toNum(item.roulagePer1000).toFixed(2),
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditOffsetTier(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingOffsetTier({ id: item.id, bindingTypeId })}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const bindings = (data as BindingType[]) ?? [];

  const bindingsWithTiers = bindings.filter(
    (bt) => (bt.digitalPriceTiers?.length ?? 0) > 0 || (bt.offsetPriceTiers?.length ?? 0) > 0
  );

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Façonnage / Reliure"
        description="Types de reliure et tarifs associés (numérique et offset)"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="types">Types de reliure</TabsTrigger>
          {bindingsWithTiers.map((bt) => (
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

        {bindingsWithTiers.map((bt) => {
          const subTab = bindingSubTabs[bt.id] ?? "digital";
          return (
            <TabsContent key={bt.id} value={bt.id} className="mt-4">
              <Tabs
                value={subTab}
                onValueChange={(v) => setBindingSubTabs((p) => ({ ...p, [bt.id]: v }))}
              >
                <TabsList>
                  <TabsTrigger value="digital">
                    Numérique ({bt.digitalPriceTiers?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="offset">
                    Offset ({bt.offsetPriceTiers?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="digital" className="mt-3">
                  <ConfigDataTable<TierRow>
                    data={(bt.digitalPriceTiers ?? []) as TierRow[]}
                    columns={digitalTierColumns(bt.id)}
                    onAdd={() => openAddDigitalTier(bt.id)}
                    addLabel="Ajouter un tarif numérique"
                    isLoading={isLoading}
                  />
                </TabsContent>

                <TabsContent value="offset" className="mt-3">
                  <ConfigDataTable<OffsetTierRow>
                    data={(bt.offsetPriceTiers ?? []) as OffsetTierRow[]}
                    columns={offsetTierColumns(bt.id)}
                    onAdd={() => openAddOffsetTier(bt.id)}
                    addLabel="Ajouter un tarif offset"
                    isLoading={isLoading}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Binding type add/edit dialog */}
      <ConfigDialog
        open={bindingDialogOpen}
        onOpenChange={setBindingDialogOpen}
        title={editingBinding ? "Modifier le type de reliure" : "Ajouter un type de reliure"}
        onSubmit={handleBindingSubmit}
        onCancel={() => setBindingDialogOpen(false)}
        isSubmitting={isSubmittingBinding}
      >
        <div className="space-y-2">
          <Label htmlFor="binding-name">Nom</Label>
          <Input
            id="binding-name"
            value={bindingForm.name}
            onChange={(e) => setBindingForm((f) => ({ ...f, name: e.target.value }))}
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
              setBindingForm((f) => ({ ...f, minPages: parseInt(e.target.value) || 0 }))
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
              setBindingForm((f) => ({ ...f, maxPages: v === "" ? null : parseInt(v) || 0 }));
            }}
            placeholder="∞"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="binding-active"
            checked={bindingForm.active}
            onCheckedChange={(checked) => setBindingForm((f) => ({ ...f, active: checked }))}
          />
          <Label htmlFor="binding-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Digital tier add/edit dialog */}
      <ConfigDialog
        open={digitalTierDialogOpen}
        onOpenChange={setDigitalTierDialogOpen}
        title={editingDigitalTier ? "Modifier le tarif numérique" : "Ajouter un tarif numérique"}
        onSubmit={handleDigitalTierSubmit}
        onCancel={() => setDigitalTierDialogOpen(false)}
        isSubmitting={isSubmittingDigitalTier}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dt-pageMin">Pages min</Label>
            <Input
              id="dt-pageMin"
              type="number"
              min={0}
              value={digitalTierForm.pageRangeMin || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, pageRangeMin: parseInt(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-pageMax">Pages max</Label>
            <Input
              id="dt-pageMax"
              type="number"
              min={0}
              value={digitalTierForm.pageRangeMax || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, pageRangeMax: parseInt(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-qtyMin">Quantité min</Label>
            <Input
              id="dt-qtyMin"
              type="number"
              min={0}
              value={digitalTierForm.qtyMin || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, qtyMin: parseInt(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-qtyMax">Quantité max</Label>
            <Input
              id="dt-qtyMax"
              type="number"
              min={0}
              value={digitalTierForm.qtyMax || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, qtyMax: parseInt(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-perUnit">Coût/unité (€)</Label>
            <Input
              id="dt-perUnit"
              type="number"
              step={0.001}
              min={0}
              value={digitalTierForm.perUnitCost || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, perUnitCost: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-setup">Mise en route (€)</Label>
            <Input
              id="dt-setup"
              type="number"
              step={0.01}
              min={0}
              value={digitalTierForm.setupCost || ""}
              onChange={(e) =>
                setDigitalTierForm((f) => ({ ...f, setupCost: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
        </div>
      </ConfigDialog>

      {/* Offset tier add/edit dialog */}
      <ConfigDialog
        open={offsetTierDialogOpen}
        onOpenChange={setOffsetTierDialogOpen}
        title={editingOffsetTier ? "Modifier le tarif offset" : "Ajouter un tarif offset"}
        onSubmit={handleOffsetTierSubmit}
        onCancel={() => setOffsetTierDialogOpen(false)}
        isSubmitting={isSubmittingOffsetTier}
      >
        <div className="space-y-2">
          <Label htmlFor="ot-cahiers">Nombre de cahiers</Label>
          <Input
            id="ot-cahiers"
            type="number"
            min={1}
            value={offsetTierForm.cahiersCount || ""}
            onChange={(e) =>
              setOffsetTierForm((f) => ({ ...f, cahiersCount: parseInt(e.target.value) || 1 }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ot-calage">Calage (€)</Label>
          <Input
            id="ot-calage"
            type="number"
            step={0.01}
            min={0}
            value={offsetTierForm.calageCost || ""}
            onChange={(e) =>
              setOffsetTierForm((f) => ({ ...f, calageCost: parseFloat(e.target.value) || 0 }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ot-roulage">Roulage / 1000 ex. (€)</Label>
          <Input
            id="ot-roulage"
            type="number"
            step={0.01}
            min={0}
            value={offsetTierForm.roulagePer1000 || ""}
            onChange={(e) =>
              setOffsetTierForm((f) => ({ ...f, roulagePer1000: parseFloat(e.target.value) || 0 }))
            }
            required
          />
        </div>
      </ConfigDialog>

      {/* Delete dialogs */}
      <DeleteConfirmDialog
        open={!!deletingBinding}
        onOpenChange={(open) => !open && setDeletingBinding(null)}
        onConfirm={handleDeleteBinding}
        title="Supprimer le type de reliure"
        description={`Supprimer « ${deletingBinding?.name} » et tous ses tarifs ? Cette action est irréversible.`}
        isDeleting={isDeletingBinding}
      />

      <DeleteConfirmDialog
        open={!!deletingDigitalTier}
        onOpenChange={(open) => !open && setDeletingDigitalTier(null)}
        onConfirm={handleDeleteDigitalTier}
        title="Supprimer le tarif numérique"
        description="Voulez-vous supprimer ce tarif numérique ? Cette action est irréversible."
        isDeleting={isDeletingDigitalTier}
      />

      <DeleteConfirmDialog
        open={!!deletingOffsetTier}
        onOpenChange={(open) => !open && setDeletingOffsetTier(null)}
        onConfirm={handleDeleteOffsetTier}
        title="Supprimer le tarif offset"
        description="Voulez-vous supprimer ce tarif offset ? Cette action est irréversible."
        isDeleting={isDeletingOffsetTier}
      />
    </div>
  );
}
