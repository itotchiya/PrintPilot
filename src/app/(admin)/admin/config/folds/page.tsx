"use client";

import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { ConfigForm } from "@/components/admin/ConfigForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useConfigData } from "@/hooks/useConfigData";

interface FoldCost {
  id: string;
  foldTypeId: string;
  numFolds: number;
  cost: number;
}

interface FoldType {
  id: string;
  name: string;
  maxFolds: number;
  canBeSecondary: boolean;
  active: boolean;
  costs: FoldCost[];
}

type FoldTypeRow = FoldType & Record<string, unknown>;

const EMPTY_FOLD: Omit<FoldType, "id" | "costs"> = {
  name: "",
  maxFolds: 6,
  canBeSecondary: false,
  active: true,
};

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

export default function FoldsConfigPage() {
  const { data, isLoading, refetch, create, update, remove } =
    useConfigData<FoldType>("folds");

  const [foldDialogOpen, setFoldDialogOpen] = useState(false);
  const [editingFold, setEditingFold] = useState<FoldType | null>(null);
  const [foldForm, setFoldForm] = useState(EMPTY_FOLD);
  const [isSubmittingFold, setIsSubmittingFold] = useState(false);

  const [deletingFold, setDeletingFold] = useState<FoldType | null>(null);
  const [isDeletingFold, setIsDeletingFold] = useState(false);

  const openAddFold = () => {
    setEditingFold(null);
    setFoldForm(EMPTY_FOLD);
    setFoldDialogOpen(true);
  };

  const openEditFold = (ft: FoldType) => {
    setEditingFold(ft);
    setFoldForm({
      name: ft.name,
      maxFolds: ft.maxFolds,
      canBeSecondary: ft.canBeSecondary,
      active: ft.active,
    });
    setFoldDialogOpen(true);
  };

  const handleFoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFold(true);
    try {
      if (editingFold) {
        await update({ id: editingFold.id, ...foldForm });
      } else {
        await create(foldForm);
      }
      setFoldDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingFold(false);
    }
  };

  const handleDeleteFold = async () => {
    if (!deletingFold) return;
    setIsDeletingFold(true);
    try {
      await remove(deletingFold.id);
      setDeletingFold(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingFold(false);
    }
  };

  const foldColumns: ColumnDef<FoldTypeRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    {
      key: "maxFolds",
      header: "Plis max",
      cell: (item) => item.maxFolds,
    },
    {
      key: "canBeSecondary",
      header: "Secondaire",
      cell: (item) => (item.canBeSecondary ? "Oui" : "Non"),
    },
    {
      key: "active",
      header: "Statut",
      cell: (item) => <StatusBadge active={item.active} />,
    },
    {
      key: "costsCount",
      header: "Coûts",
      cell: (item) =>
        `${(item.costs?.length ?? 0)} coûts`,
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
            onClick={() => openEditFold(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingFold(item)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const foldTypes = (data as FoldType[]) ?? [];

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Pliage"
        description="Types de plis et coûts par nombre de plis"
      />

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Types de plis</TabsTrigger>
          {foldTypes.map((ft) => (
            <TabsTrigger key={ft.id} value={ft.id}>
              {ft.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <ConfigDataTable<FoldTypeRow>
            data={foldTypes as FoldTypeRow[]}
            columns={foldColumns}
            searchField="name"
            searchPlaceholder="Rechercher un type de pli…"
            onAdd={openAddFold}
            addLabel="Ajouter un type"
            isLoading={isLoading}
          />
        </TabsContent>

        {foldTypes.map((ft) => (
          <TabsContent key={ft.id} value={ft.id} className="mt-4">
            <div className="space-y-4">
              <div className="rounded-xl border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre de plis</TableHead>
                      <TableHead>Coût €</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ft.costs ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Aucun coût défini
                        </TableCell>
                      </TableRow>
                    ) : (
                      (ft.costs ?? [])
                        .sort(
                          (a, b) =>
                            toNum(a.numFolds) - toNum(b.numFolds)
                        )
                        .map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell>{cost.numFolds}</TableCell>
                            <TableCell>
                              {toNum(cost.cost).toFixed(2)} €
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Édition des coûts à venir — les coûts sont affichés en lecture
                seule. Une API dédiée sera ajoutée pour modifier les coûts par
                nombre de plis.
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Fold type add/edit dialog */}
      <Dialog open={foldDialogOpen} onOpenChange={setFoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFold
                ? "Modifier le type de pli"
                : "Ajouter un type de pli"}
            </DialogTitle>
          </DialogHeader>
          <ConfigForm
            title={editingFold ? "Modifier" : "Nouveau type"}
            onSubmit={handleFoldSubmit}
            onCancel={() => setFoldDialogOpen(false)}
            isSubmitting={isSubmittingFold}
          >
            <div className="space-y-2">
              <Label htmlFor="fold-name">Nom</Label>
              <Input
                id="fold-name"
                value={foldForm.name}
                onChange={(e) =>
                  setFoldForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fold-maxFolds">Nombre max de plis</Label>
              <Input
                id="fold-maxFolds"
                type="number"
                min={1}
                value={foldForm.maxFolds || ""}
                onChange={(e) =>
                  setFoldForm((f) => ({
                    ...f,
                    maxFolds: parseInt(e.target.value) || 6,
                  }))
                }
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="fold-canBeSecondary"
                checked={foldForm.canBeSecondary}
                onCheckedChange={(checked) =>
                  setFoldForm((f) => ({
                    ...f,
                    canBeSecondary: checked,
                  }))
                }
              />
              <Label htmlFor="fold-canBeSecondary">
                Peut être pli secondaire
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="fold-active"
                checked={foldForm.active}
                onCheckedChange={(checked) =>
                  setFoldForm((f) => ({ ...f, active: checked }))
                }
              />
              <Label htmlFor="fold-active">Actif</Label>
            </div>
          </ConfigForm>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletingFold}
        onOpenChange={(open) => !open && setDeletingFold(null)}
        onConfirm={handleDeleteFold}
        title="Supprimer le type de pli"
        description={`Supprimer « ${deletingFold?.name} » et tous ses coûts ? Cette action est irréversible.`}
        isDeleting={isDeletingFold}
      />
    </div>
  );
}
