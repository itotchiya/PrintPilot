"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import { ConfigDataTable, type ColumnDef } from "@/components/admin/ConfigDataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { useConfigData } from "@/hooks/useConfigData";

interface LaminationPriceTier {
  id: string;
  finishId: string;
  qtyMin: number;
  qtyMax: number;
  pricePerSheet: number;
  setupCost: number;
}

interface LaminationFinish {
  id: string;
  name: string;
  offsetPricePerM2: number;
  offsetCalageForfait: number;
  offsetMinimumBilling: number;
  active: boolean;
  digitalPriceTiers: LaminationPriceTier[];
}

const emptyFinish: Omit<LaminationFinish, "id" | "digitalPriceTiers"> = {
  name: "",
  offsetPricePerM2: 0,
  offsetCalageForfait: 0,
  offsetMinimumBilling: 0,
  active: true,
};

const emptyTier: Omit<LaminationPriceTier, "id" | "finishId"> = {
  qtyMin: 0,
  qtyMax: 0,
  pricePerSheet: 0,
  setupCost: 0,
};

export default function LaminationConfigPage() {
  const { data: finishes, isLoading, refetch, create, update, remove } =
    useConfigData<LaminationFinish>("lamination");

  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [editingFinish, setEditingFinish] = useState<LaminationFinish | null>(null);
  const [finishForm, setFinishForm] = useState(emptyFinish);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LaminationFinish | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LaminationPriceTier | null>(null);
  const [tierForm, setTierForm] = useState(emptyTier);
  const [tierFinishId, setTierFinishId] = useState<string | null>(null);
  const [isTierSubmitting, setIsTierSubmitting] = useState(false);

  const [tierDeleteTarget, setTierDeleteTarget] = useState<{
    tier: LaminationPriceTier;
    finishId: string;
  } | null>(null);
  const [isTierDeleting, setIsTierDeleting] = useState(false);

  // --- Finish CRUD ---

  const openAddFinish = useCallback(() => {
    setEditingFinish(null);
    setFinishForm(emptyFinish);
    setFinishDialogOpen(true);
  }, []);

  const openEditFinish = useCallback((f: LaminationFinish) => {
    setEditingFinish(f);
    setFinishForm({
      name: f.name,
      offsetPricePerM2: f.offsetPricePerM2,
      offsetCalageForfait: f.offsetCalageForfait,
      offsetMinimumBilling: f.offsetMinimumBilling,
      active: f.active,
    });
    setFinishDialogOpen(true);
  }, []);

  const handleFinishSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      if (editingFinish) {
        await update({ id: editingFinish.id, ...finishForm });
      } else {
        await create(finishForm);
      }
      setFinishDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingFinish, finishForm, create, update]);

  const handleDeleteFinish = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, remove]);

  // --- Tier CRUD ---

  const openAddTier = useCallback((finishId: string) => {
    setTierFinishId(finishId);
    setEditingTier(null);
    setTierForm(emptyTier);
    setTierDialogOpen(true);
  }, []);

  const openEditTier = useCallback(
    (tier: LaminationPriceTier, finishId: string) => {
      setTierFinishId(finishId);
      setEditingTier(tier);
      setTierForm({
        qtyMin: tier.qtyMin,
        qtyMax: tier.qtyMax,
        pricePerSheet: tier.pricePerSheet,
        setupCost: tier.setupCost,
      });
      setTierDialogOpen(true);
    },
    [],
  );

  const handleTierSubmit = useCallback(async () => {
    if (!tierFinishId) return;
    setIsTierSubmitting(true);
    try {
      const url = `/api/admin/config/lamination/${tierFinishId}/tiers`;
      const method = editingTier ? "PUT" : "POST";
      const body = editingTier ? { id: editingTier.id, ...tierForm } : tierForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingTier ? "Palier modifi\u00e9" : "Palier cr\u00e9\u00e9");
      setTierDialogOpen(false);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsTierSubmitting(false);
    }
  }, [tierFinishId, editingTier, tierForm, refetch]);

  const handleDeleteTier = useCallback(async () => {
    if (!tierDeleteTarget) return;
    setIsTierDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/config/lamination/${tierDeleteTarget.finishId}/tiers?id=${tierDeleteTarget.tier.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Palier supprim\u00e9");
      setTierDeleteTarget(null);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsTierDeleting(false);
    }
  }, [tierDeleteTarget, refetch]);

  // --- Columns ---

  const finishColumns: ColumnDef<LaminationFinish>[] = useMemo(
    () => [
      { key: "name", header: "Nom", sortable: true },
      {
        key: "offsetPricePerM2",
        header: "Prix/m\u00b2 offset \u20ac",
        cell: (f) => f.offsetPricePerM2.toFixed(2),
      },
      {
        key: "offsetCalageForfait",
        header: "Calage \u20ac",
        cell: (f) => f.offsetCalageForfait.toFixed(2),
      },
      {
        key: "offsetMinimumBilling",
        header: "Minimum facturation \u20ac",
        cell: (f) => f.offsetMinimumBilling.toFixed(2),
      },
      {
        key: "digitalPriceTiers",
        header: "Paliers",
        cell: (f) => `${f.digitalPriceTiers.length} paliers`,
      },
      {
        key: "active",
        header: "Statut",
        cell: (f) => <StatusBadge active={f.active} />,
      },
      {
        key: "actions",
        header: "",
        className: "w-[100px]",
        cell: (f) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEditFinish(f)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(f)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditFinish],
  );

  const buildTierColumns = useCallback(
    (finishId: string): ColumnDef<LaminationPriceTier>[] => [
      {
        key: "quantity",
        header: "Quantit\u00e9",
        sortable: true,
        cell: (t) => `${t.qtyMin}-${t.qtyMax}`,
      },
      {
        key: "pricePerSheet",
        header: "Prix/feuille \u20ac",
        cell: (t) => t.pricePerSheet.toFixed(3),
      },
      {
        key: "setupCost",
        header: "Mise en route \u20ac",
        cell: (t) => t.setupCost.toFixed(2),
      },
      {
        key: "actions",
        header: "",
        className: "w-[100px]",
        cell: (t) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditTier(t, finishId)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTierDeleteTarget({ tier: t, finishId })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditTier],
  );

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Pelliculage"
        description="Finitions de pelliculage et tarifs"
      />

      <Tabs defaultValue="finishes">
        <TabsList>
          <TabsTrigger value="finishes">Finitions</TabsTrigger>
          {finishes.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="finishes" className="mt-4">
          <ConfigDataTable
            data={finishes as unknown as Record<string, unknown>[]}
            columns={
              finishColumns as unknown as ColumnDef<Record<string, unknown>>[]
            }
            searchField="name"
            searchPlaceholder="Rechercher une finition\u2026"
            onAdd={openAddFinish}
            addLabel="Ajouter une finition"
            isLoading={isLoading}
          />
        </TabsContent>

        {finishes.map((f) => (
          <TabsContent key={f.id} value={f.id} className="mt-4">
            <ConfigDataTable
              data={
                f.digitalPriceTiers as unknown as Record<string, unknown>[]
              }
              columns={
                buildTierColumns(f.id) as unknown as ColumnDef<
                  Record<string, unknown>
                >[]
              }
              onAdd={() => openAddTier(f.id)}
              addLabel="Ajouter un palier"
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Finish dialog */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFinish ? "Modifier la finition" : "Nouvelle finition"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFinishSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="finish-name">Nom</Label>
              <Input
                id="finish-name"
                value={finishForm.name}
                onChange={(e) =>
                  setFinishForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finish-price">Prix/m² offset (€)</Label>
                <Input
                  id="finish-price"
                  type="number"
                  step={0.01}
                  value={finishForm.offsetPricePerM2}
                  onChange={(e) =>
                    setFinishForm((p) => ({
                      ...p,
                      offsetPricePerM2: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finish-calage">Calage (€)</Label>
                <Input
                  id="finish-calage"
                  type="number"
                  step={0.01}
                  value={finishForm.offsetCalageForfait}
                  onChange={(e) =>
                    setFinishForm((p) => ({
                      ...p,
                      offsetCalageForfait: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-min-billing">
                Minimum facturation (€)
              </Label>
              <Input
                id="finish-min-billing"
                type="number"
                step={0.01}
                value={finishForm.offsetMinimumBilling}
                onChange={(e) =>
                  setFinishForm((p) => ({
                    ...p,
                    offsetMinimumBilling: parseFloat(e.target.value) || 0,
                  }))
                }
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="finish-active"
                checked={finishForm.active}
                onCheckedChange={(v) =>
                  setFinishForm((p) => ({ ...p, active: v }))
                }
              />
              <Label htmlFor="finish-active">Actif</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinishDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement\u2026" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tier dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "Modifier le palier" : "Nouveau palier"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTierSubmit();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-qty-min">Quantité min</Label>
                <Input
                  id="tier-qty-min"
                  type="number"
                  value={tierForm.qtyMin}
                  onChange={(e) =>
                    setTierForm((p) => ({
                      ...p,
                      qtyMin: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-qty-max">Quantité max</Label>
                <Input
                  id="tier-qty-max"
                  type="number"
                  value={tierForm.qtyMax}
                  onChange={(e) =>
                    setTierForm((p) => ({
                      ...p,
                      qtyMax: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-price">Prix/feuille (€)</Label>
                <Input
                  id="tier-price"
                  type="number"
                  step={0.001}
                  value={tierForm.pricePerSheet}
                  onChange={(e) =>
                    setTierForm((p) => ({
                      ...p,
                      pricePerSheet: parseFloat(e.target.value) || 0,
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
                  value={tierForm.setupCost}
                  onChange={(e) =>
                    setTierForm((p) => ({
                      ...p,
                      setupCost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTierDialogOpen(false)}
                disabled={isTierSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isTierSubmitting}>
                {isTierSubmitting ? "Enregistrement\u2026" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialogs */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteFinish}
        isDeleting={isDeleting}
      />
      <DeleteConfirmDialog
        open={!!tierDeleteTarget}
        onOpenChange={(open) => !open && setTierDeleteTarget(null)}
        onConfirm={handleDeleteTier}
        title="Supprimer le palier"
        description="Ce palier de tarification sera définitivement supprimé."
        isDeleting={isTierDeleting}
      />
    </div>
  );
}
