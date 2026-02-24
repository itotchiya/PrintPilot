"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";

// ── Types ──────────────────────────────────────────────────────────────────

interface MachineFormat {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  isDefault: boolean;
  active: boolean;
}

interface FormatClickDivisor {
  id: string;
  formatName: string;
  divisorRecto: number;
  divisorRectoVerso: number;
}

type MachineRow = MachineFormat & Record<string, unknown>;
type DivisorRow = FormatClickDivisor & Record<string, unknown>;

const EMPTY_MACHINE: Omit<MachineFormat, "id"> = {
  name: "",
  widthCm: 0,
  heightCm: 0,
  isDefault: false,
  active: true,
};

const EMPTY_DIVISOR: Omit<FormatClickDivisor, "id"> = {
  formatName: "",
  divisorRecto: 1,
  divisorRectoVerso: 2,
};

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MachinesConfigPage() {
  // ── Machine formats ─────────────────────────────────────────────────────
  const [machines, setMachines] = useState<MachineFormat[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(true);

  const fetchMachines = useCallback(async () => {
    setMachinesLoading(true);
    try {
      const res = await fetch("/api/admin/config/machine-formats");
      if (!res.ok) throw new Error("Erreur de chargement");
      setMachines(await res.json());
    } catch {
      toast.error("Impossible de charger les formats machines");
    } finally {
      setMachinesLoading(false);
    }
  }, []);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);

  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineFormat | null>(null);
  const [machineForm, setMachineForm] = useState(EMPTY_MACHINE);
  const [isMachineSubmitting, setIsMachineSubmitting] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState<MachineFormat | null>(null);
  const [isMachineDeleting, setIsMachineDeleting] = useState(false);

  const openAddMachine = () => {
    setEditingMachine(null);
    setMachineForm(EMPTY_MACHINE);
    setMachineDialogOpen(true);
  };

  const openEditMachine = (m: MachineFormat) => {
    setEditingMachine(m);
    setMachineForm({
      name: m.name,
      widthCm: toNum(m.widthCm),
      heightCm: toNum(m.heightCm),
      isDefault: m.isDefault,
      active: m.active,
    });
    setMachineDialogOpen(true);
  };

  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMachineSubmitting(true);
    try {
      const res = await fetch("/api/admin/config/machine-formats", {
        method: editingMachine ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMachine ? { id: editingMachine.id, ...machineForm } : machineForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingMachine ? "Format mis à jour" : "Format créé");
      await fetchMachines();
      setMachineDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsMachineSubmitting(false);
    }
  };

  const handleDeleteMachine = async () => {
    if (!deletingMachine) return;
    setIsMachineDeleting(true);
    try {
      const res = await fetch(`/api/admin/config/machine-formats?id=${deletingMachine.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Format supprimé");
      await fetchMachines();
      setDeletingMachine(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsMachineDeleting(false);
    }
  };

  // ── Click divisors ───────────────────────────────────────────────────────
  const [divisors, setDivisors] = useState<FormatClickDivisor[]>([]);
  const [divisorsLoading, setDivisorsLoading] = useState(true);

  const fetchDivisors = useCallback(async () => {
    setDivisorsLoading(true);
    try {
      const res = await fetch("/api/admin/config/click-divisors");
      if (!res.ok) throw new Error("Erreur de chargement");
      setDivisors(await res.json());
    } catch {
      toast.error("Impossible de charger les diviseurs clics");
    } finally {
      setDivisorsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDivisors(); }, [fetchDivisors]);

  const [divisorDialogOpen, setDivisorDialogOpen] = useState(false);
  const [editingDivisor, setEditingDivisor] = useState<FormatClickDivisor | null>(null);
  const [divisorForm, setDivisorForm] = useState(EMPTY_DIVISOR);
  const [isDivisorSubmitting, setIsDivisorSubmitting] = useState(false);
  const [deletingDivisor, setDeletingDivisor] = useState<FormatClickDivisor | null>(null);
  const [isDivisorDeleting, setIsDivisorDeleting] = useState(false);

  const openAddDivisor = () => {
    setEditingDivisor(null);
    setDivisorForm(EMPTY_DIVISOR);
    setDivisorDialogOpen(true);
  };

  const openEditDivisor = (d: FormatClickDivisor) => {
    setEditingDivisor(d);
    setDivisorForm({
      formatName: d.formatName,
      divisorRecto: toNum(d.divisorRecto),
      divisorRectoVerso: toNum(d.divisorRectoVerso),
    });
    setDivisorDialogOpen(true);
  };

  const handleDivisorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDivisorSubmitting(true);
    try {
      const res = await fetch("/api/admin/config/click-divisors", {
        method: editingDivisor ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDivisor ? { id: editingDivisor.id, ...divisorForm } : divisorForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingDivisor ? "Diviseur mis à jour" : "Diviseur créé");
      await fetchDivisors();
      setDivisorDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsDivisorSubmitting(false);
    }
  };

  const handleDeleteDivisor = async () => {
    if (!deletingDivisor) return;
    setIsDivisorDeleting(true);
    try {
      const res = await fetch(`/api/admin/config/click-divisors?id=${deletingDivisor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Diviseur supprimé");
      await fetchDivisors();
      setDeletingDivisor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDivisorDeleting(false);
    }
  };

  // ── Column definitions ────────────────────────────────────────────────────

  const machineColumns: ColumnDef<MachineRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    {
      key: "dimensions",
      header: "Dimensions (cm)",
      cell: (item) => `${toNum(item.widthCm)} × ${toNum(item.heightCm)}`,
    },
    {
      key: "isDefault",
      header: "Par défaut",
      cell: (item) =>
        item.isDefault ? (
          <Badge variant="secondary">Par défaut</Badge>
        ) : null,
    },
    { key: "active", header: "Statut", cell: (item) => <StatusBadge active={item.active} /> },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditMachine(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingMachine(item)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const divisorColumns: ColumnDef<DivisorRow>[] = [
    { key: "formatName", header: "Format", sortable: true },
    {
      key: "divisorRecto",
      header: "Diviseur recto",
      cell: (item) => toNum(item.divisorRecto),
    },
    {
      key: "divisorRectoVerso",
      header: "Diviseur R/V",
      cell: (item) => toNum(item.divisorRectoVerso),
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditDivisor(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingDivisor(item)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Machines & Presses"
        description="Formats machines pour l'imposition et diviseurs de clics par format"
        itemCount={machines.length + divisors.length}
      />

      <Tabs defaultValue="machines">
        <TabsList>
          <TabsTrigger value="machines">
            Formats machines ({machines.length})
          </TabsTrigger>
          <TabsTrigger value="divisors">
            Diviseurs clics ({divisors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="mt-4">
          <ConfigDataTable<MachineRow>
            data={machines as MachineRow[]}
            columns={machineColumns}
            searchField="name"
            searchPlaceholder="Rechercher un format machine…"
            onAdd={openAddMachine}
            addLabel="Ajouter un format"
            isLoading={machinesLoading}
          />
        </TabsContent>

        <TabsContent value="divisors" className="mt-4">
          <ConfigDataTable<DivisorRow>
            data={divisors as DivisorRow[]}
            columns={divisorColumns}
            searchField="formatName"
            searchPlaceholder="Rechercher un format…"
            onAdd={openAddDivisor}
            addLabel="Ajouter un diviseur"
            isLoading={divisorsLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Machine format dialog */}
      <ConfigDialog
        open={machineDialogOpen}
        onOpenChange={setMachineDialogOpen}
        title={editingMachine ? "Modifier le format machine" : "Ajouter un format machine"}
        onSubmit={handleMachineSubmit}
        onCancel={() => setMachineDialogOpen(false)}
        isSubmitting={isMachineSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="mf-name">Nom</Label>
          <Input
            id="mf-name"
            value={machineForm.name}
            onChange={(e) => setMachineForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ex : 72×102 SRA3"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mf-width">Largeur (cm)</Label>
            <Input
              id="mf-width"
              type="number"
              step={0.1}
              min={0}
              value={machineForm.widthCm || ""}
              onChange={(e) =>
                setMachineForm((f) => ({ ...f, widthCm: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mf-height">Hauteur (cm)</Label>
            <Input
              id="mf-height"
              type="number"
              step={0.1}
              min={0}
              value={machineForm.heightCm || ""}
              onChange={(e) =>
                setMachineForm((f) => ({ ...f, heightCm: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="mf-default"
            checked={machineForm.isDefault}
            onCheckedChange={(v) => setMachineForm((f) => ({ ...f, isDefault: v }))}
          />
          <Label htmlFor="mf-default">Format par défaut</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="mf-active"
            checked={machineForm.active}
            onCheckedChange={(v) => setMachineForm((f) => ({ ...f, active: v }))}
          />
          <Label htmlFor="mf-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Click divisor dialog */}
      <ConfigDialog
        open={divisorDialogOpen}
        onOpenChange={setDivisorDialogOpen}
        title={editingDivisor ? "Modifier le diviseur" : "Ajouter un diviseur de clics"}
        onSubmit={handleDivisorSubmit}
        onCancel={() => setDivisorDialogOpen(false)}
        isSubmitting={isDivisorSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="cd-name">Nom du format</Label>
          <Input
            id="cd-name"
            value={divisorForm.formatName}
            onChange={(e) => setDivisorForm((f) => ({ ...f, formatName: e.target.value }))}
            placeholder="ex : A4, A5, 21x29.7"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cd-recto">Diviseur recto</Label>
            <Input
              id="cd-recto"
              type="number"
              step={1}
              min={1}
              value={divisorForm.divisorRecto || ""}
              onChange={(e) =>
                setDivisorForm((f) => ({ ...f, divisorRecto: parseFloat(e.target.value) || 1 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cd-rv">Diviseur recto/verso</Label>
            <Input
              id="cd-rv"
              type="number"
              step={1}
              min={1}
              value={divisorForm.divisorRectoVerso || ""}
              onChange={(e) =>
                setDivisorForm((f) => ({
                  ...f,
                  divisorRectoVerso: parseFloat(e.target.value) || 2,
                }))
              }
              required
            />
          </div>
        </div>
      </ConfigDialog>

      {/* Delete dialogs */}
      <DeleteConfirmDialog
        open={!!deletingMachine}
        onOpenChange={(open) => !open && setDeletingMachine(null)}
        onConfirm={handleDeleteMachine}
        title="Supprimer le format machine"
        description={`Supprimer « ${deletingMachine?.name} » ? Cette action est irréversible.`}
        isDeleting={isMachineDeleting}
      />

      <DeleteConfirmDialog
        open={!!deletingDivisor}
        onOpenChange={(open) => !open && setDeletingDivisor(null)}
        onConfirm={handleDeleteDivisor}
        title="Supprimer le diviseur"
        description={`Supprimer le diviseur pour « ${deletingDivisor?.formatName} » ? Cette action est irréversible.`}
        isDeleting={isDivisorDeleting}
      />
    </div>
  );
}
