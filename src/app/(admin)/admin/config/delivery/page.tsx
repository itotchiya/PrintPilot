"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { useConfigData } from "@/hooks/useConfigData";

// --- Types ---

interface Department {
  id: string;
  code: string;
  name: string;
  zone: number;
  isSpecialZone: boolean;
  displayName: string;
}

interface Carrier {
  id: string;
  name: string;
  active: boolean;
}

interface DeliveryRate {
  id: string;
  carrierId: string;
  zone: number;
  maxWeightKg: number;
  price: number;
}

interface TransportRateByDept {
  id: string;
  carrierId: string;
  departmentCode: string;
  maxWeightKg: number;
  price: number;
}

type DeptRateFormData = Pick<TransportRateByDept, "departmentCode" | "maxWeightKg" | "price">;

type DeptFormData = Pick<Department, "code" | "name" | "zone" | "isSpecialZone">;
type CarrierFormData = Pick<Carrier, "name" | "active">;
type RateFormData = Pick<DeliveryRate, "zone" | "maxWeightKg" | "price">;

const emptyDept: DeptFormData = {
  code: "",
  name: "",
  zone: 1,
  isSpecialZone: false,
};

const emptyCarrier: CarrierFormData = { name: "", active: true };

const emptyRate: RateFormData = { zone: 1, maxWeightKg: 0, price: 0 };

const emptyDeptRate: DeptRateFormData = { departmentCode: "", maxWeightKg: 0, price: 0 };

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export default function DeliveryConfigPage() {
  // --- Departments (via useConfigData) ---
  const {
    data: departments,
    isLoading: deptsLoading,
    create: createDept,
    update: updateDept,
    remove: removeDept,
  } = useConfigData<Department>("delivery");

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<DeptFormData>(emptyDept);
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);
  const [deptDeleteTarget, setDeptDeleteTarget] = useState<Department | null>(null);
  const [isDeptDeleting, setIsDeptDeleting] = useState(false);

  // --- Carriers (direct fetch) ---
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(true);

  const fetchCarriers = useCallback(async () => {
    setCarriersLoading(true);
    try {
      const res = await fetch("/api/admin/config/carriers");
      if (!res.ok) throw new Error("Erreur de chargement");
      setCarriers(await res.json());
    } catch {
      toast.error("Impossible de charger les transporteurs");
    } finally {
      setCarriersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [carrierForm, setCarrierForm] = useState<CarrierFormData>(emptyCarrier);
  const [isCarrierSubmitting, setIsCarrierSubmitting] = useState(false);
  const [carrierDeleteTarget, setCarrierDeleteTarget] = useState<Carrier | null>(null);
  const [isCarrierDeleting, setIsCarrierDeleting] = useState(false);

  // --- Rates (per carrier, fetched on tab select) ---
  const [ratesMap, setRatesMap] = useState<Record<string, DeliveryRate[]>>({});
  const [ratesLoading, setRatesLoading] = useState<Record<string, boolean>>({});

  const fetchRates = useCallback(async (carrierId: string) => {
    setRatesLoading((p) => ({ ...p, [carrierId]: true }));
    try {
      const res = await fetch(`/api/admin/config/carriers/${carrierId}/rates`);
      if (!res.ok) throw new Error("Erreur");
      const data: DeliveryRate[] = await res.json();
      setRatesMap((p) => ({ ...p, [carrierId]: data }));
    } catch {
      toast.error("Impossible de charger les tarifs");
    } finally {
      setRatesLoading((p) => ({ ...p, [carrierId]: false }));
    }
  }, []);

  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DeliveryRate | null>(null);
  const [rateForm, setRateForm] = useState<RateFormData>(emptyRate);
  const [rateCarrierId, setRateCarrierId] = useState<string | null>(null);
  const [isRateSubmitting, setIsRateSubmitting] = useState(false);
  const [rateDeleteTarget, setRateDeleteTarget] = useState<{
    rate: DeliveryRate;
    carrierId: string;
  } | null>(null);
  const [isRateDeleting, setIsRateDeleting] = useState(false);

  // --- Per-dept rates (TransportRateByDept) ---
  const [deptRatesMap, setDeptRatesMap] = useState<Record<string, TransportRateByDept[]>>({});
  const [deptRatesLoading, setDeptRatesLoading] = useState<Record<string, boolean>>({});
  const [deptRatesSearch, setDeptRatesSearch] = useState<Record<string, string>>({});

  const fetchDeptRates = useCallback(async (carrierId: string, search?: string) => {
    setDeptRatesLoading((p) => ({ ...p, [carrierId]: true }));
    try {
      const q = search ? `?dept=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/config/carriers/${carrierId}/dept-rates${q}`);
      if (!res.ok) throw new Error("Erreur");
      const data: TransportRateByDept[] = await res.json();
      setDeptRatesMap((p) => ({ ...p, [carrierId]: data }));
    } catch {
      toast.error("Impossible de charger les tarifs par département");
    } finally {
      setDeptRatesLoading((p) => ({ ...p, [carrierId]: false }));
    }
  }, []);

  const [deptRateDialogOpen, setDeptRateDialogOpen] = useState(false);
  const [editingDeptRate, setEditingDeptRate] = useState<TransportRateByDept | null>(null);
  const [deptRateForm, setDeptRateForm] = useState<DeptRateFormData>(emptyDeptRate);
  const [deptRateCarrierId, setDeptRateCarrierId] = useState<string | null>(null);
  const [isDeptRateSubmitting, setIsDeptRateSubmitting] = useState(false);
  const [deptRateDeleteTarget, setDeptRateDeleteTarget] = useState<{
    rate: TransportRateByDept;
    carrierId: string;
  } | null>(null);
  const [isDeptRateDeleting, setIsDeptRateDeleting] = useState(false);

  // Per-carrier sub-tab: "zone-rates" | "dept-rates"
  const [carrierSubTabs, setCarrierSubTabs] = useState<Record<string, string>>({});

  // --- Tab state (to trigger rate fetching) ---
  const [activeTab, setActiveTab] = useState("departments");

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      const isCarrierTab = carriers.some((c) => c.id === value);
      if (isCarrierTab) {
        if (!ratesMap[value]) fetchRates(value);
      }
    },
    [carriers, ratesMap, fetchRates],
  );

  // ==================== Department CRUD ====================

  const openAddDept = useCallback(() => {
    setEditingDept(null);
    setDeptForm(emptyDept);
    setDeptDialogOpen(true);
  }, []);

  const openEditDept = useCallback((d: Department) => {
    setEditingDept(d);
    setDeptForm({
      code: d.code,
      name: d.name,
      zone: d.zone,
      isSpecialZone: d.isSpecialZone,
    });
    setDeptDialogOpen(true);
  }, []);

  const handleDeptSubmit = useCallback(async () => {
    setIsDeptSubmitting(true);
    try {
      if (editingDept) {
        await updateDept({ id: editingDept.id, ...deptForm });
      } else {
        await createDept(deptForm);
      }
      setDeptDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsDeptSubmitting(false);
    }
  }, [editingDept, deptForm, createDept, updateDept]);

  const handleDeleteDept = useCallback(async () => {
    if (!deptDeleteTarget) return;
    setIsDeptDeleting(true);
    try {
      await removeDept(deptDeleteTarget.id);
      setDeptDeleteTarget(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsDeptDeleting(false);
    }
  }, [deptDeleteTarget, removeDept]);

  // ==================== Carrier CRUD ====================

  const openAddCarrier = useCallback(() => {
    setEditingCarrier(null);
    setCarrierForm(emptyCarrier);
    setCarrierDialogOpen(true);
  }, []);

  const openEditCarrier = useCallback((c: Carrier) => {
    setEditingCarrier(c);
    setCarrierForm({ name: c.name, active: c.active });
    setCarrierDialogOpen(true);
  }, []);

  const handleCarrierSubmit = useCallback(async () => {
    setIsCarrierSubmitting(true);
    try {
      const method = editingCarrier ? "PUT" : "POST";
      const body = editingCarrier
        ? { id: editingCarrier.id, ...carrierForm }
        : carrierForm;
      const res = await fetch("/api/admin/config/carriers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(
        editingCarrier ? "Transporteur modifié" : "Transporteur créé",
      );
      setCarrierDialogOpen(false);
      await fetchCarriers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsCarrierSubmitting(false);
    }
  }, [editingCarrier, carrierForm, fetchCarriers]);

  const handleDeleteCarrier = useCallback(async () => {
    if (!carrierDeleteTarget) return;
    setIsCarrierDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/config/carriers?id=${carrierDeleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Transporteur supprimé");
      setCarrierDeleteTarget(null);
      await fetchCarriers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsCarrierDeleting(false);
    }
  }, [carrierDeleteTarget, fetchCarriers]);

  // ==================== Rate CRUD ====================

  const openAddRate = useCallback((carrierId: string) => {
    setRateCarrierId(carrierId);
    setEditingRate(null);
    setRateForm(emptyRate);
    setRateDialogOpen(true);
  }, []);

  const openEditRate = useCallback(
    (rate: DeliveryRate, carrierId: string) => {
      setRateCarrierId(carrierId);
      setEditingRate(rate);
      setRateForm({
        zone: rate.zone,
        maxWeightKg: rate.maxWeightKg,
        price: rate.price,
      });
      setRateDialogOpen(true);
    },
    [],
  );

  const handleRateSubmit = useCallback(async () => {
    if (!rateCarrierId) return;
    setIsRateSubmitting(true);
    try {
      const url = `/api/admin/config/carriers/${rateCarrierId}/rates`;
      const method = editingRate ? "PUT" : "POST";
      const body = editingRate
        ? { id: editingRate.id, ...rateForm }
        : rateForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingRate ? "Tarif modifié" : "Tarif créé");
      setRateDialogOpen(false);
      await fetchRates(rateCarrierId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsRateSubmitting(false);
    }
  }, [rateCarrierId, editingRate, rateForm, fetchRates]);

  const handleDeleteRate = useCallback(async () => {
    if (!rateDeleteTarget) return;
    setIsRateDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/config/carriers/${rateDeleteTarget.carrierId}/rates?id=${rateDeleteTarget.rate.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Tarif supprimé");
      setRateDeleteTarget(null);
      await fetchRates(rateDeleteTarget.carrierId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsRateDeleting(false);
    }
  }, [rateDeleteTarget, fetchRates]);

  // ==================== Dept-Rate CRUD ====================

  const openAddDeptRate = useCallback((carrierId: string) => {
    setDeptRateCarrierId(carrierId);
    setEditingDeptRate(null);
    setDeptRateForm(emptyDeptRate);
    setDeptRateDialogOpen(true);
  }, []);

  const openEditDeptRate = useCallback((rate: TransportRateByDept, carrierId: string) => {
    setDeptRateCarrierId(carrierId);
    setEditingDeptRate(rate);
    setDeptRateForm({
      departmentCode: rate.departmentCode,
      maxWeightKg: toNum(rate.maxWeightKg),
      price: toNum(rate.price),
    });
    setDeptRateDialogOpen(true);
  }, []);

  const handleDeptRateSubmit = useCallback(async () => {
    if (!deptRateCarrierId) return;
    setIsDeptRateSubmitting(true);
    try {
      const url = `/api/admin/config/carriers/${deptRateCarrierId}/dept-rates`;
      const method = editingDeptRate ? "PUT" : "POST";
      const body = editingDeptRate ? { id: editingDeptRate.id, ...deptRateForm } : deptRateForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(editingDeptRate ? "Tarif modifié" : "Tarif créé");
      setDeptRateDialogOpen(false);
      await fetchDeptRates(deptRateCarrierId, deptRatesSearch[deptRateCarrierId]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsDeptRateSubmitting(false);
    }
  }, [deptRateCarrierId, editingDeptRate, deptRateForm, fetchDeptRates, deptRatesSearch]);

  const handleDeleteDeptRate = useCallback(async () => {
    if (!deptRateDeleteTarget) return;
    setIsDeptRateDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/config/carriers/${deptRateDeleteTarget.carrierId}/dept-rates?id=${deptRateDeleteTarget.rate.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Tarif supprimé");
      setDeptRateDeleteTarget(null);
      await fetchDeptRates(
        deptRateDeleteTarget.carrierId,
        deptRatesSearch[deptRateDeleteTarget.carrierId],
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur de suppression");
    } finally {
      setIsDeptRateDeleting(false);
    }
  }, [deptRateDeleteTarget, fetchDeptRates, deptRatesSearch]);

  // ==================== Column definitions ====================

  const deptColumns: ColumnDef<Department>[] = useMemo(
    () => [
      { key: "code", header: "Code", sortable: true },
      { key: "name", header: "Nom", sortable: true },
      {
        key: "zone",
        header: "Zone",
        sortable: true,
        cell: (d) => `Zone ${d.zone}`,
      },
      {
        key: "isSpecialZone",
        header: "Spécial",
        cell: (d) =>
          d.isSpecialZone ? (
            <Badge variant="outline">Spécial</Badge>
          ) : null,
      },
      {
        key: "actions",
        header: "",
        className: "w-[100px]",
        cell: (d) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDept(d)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeptDeleteTarget(d)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditDept],
  );

  const carrierColumns: ColumnDef<Carrier>[] = useMemo(
    () => [
      { key: "name", header: "Nom", sortable: true },
      {
        key: "active",
        header: "Statut",
        cell: (c) => <StatusBadge active={c.active} />,
      },
      {
        key: "actions",
        header: "",
        className: "w-[130px]",
        cell: (c) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleTabChange(c.id)}
              title="Voir les tarifs"
            >
              <Eye className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditCarrier(c)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCarrierDeleteTarget(c)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditCarrier, handleTabChange],
  );

  const buildRateColumns = useCallback(
    (carrierId: string): ColumnDef<DeliveryRate>[] => [
      {
        key: "zone",
        header: "Zone",
        sortable: true,
        cell: (r) => `Zone ${r.zone}`,
      },
      {
        key: "maxWeightKg",
        header: "Poids max (kg)",
        sortable: true,
        cell: (r) => (r.maxWeightKg >= 9999 ? ">100 kg" : `${r.maxWeightKg} kg`),
      },
      {
        key: "price",
        header: "Prix €",
        cell: (r) => toNum(r.price).toFixed(2),
      },
      {
        key: "actions",
        header: "",
        className: "w-[100px]",
        cell: (r) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditRate(r, carrierId)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRateDeleteTarget({ rate: r, carrierId })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditRate],
  );

  const buildDeptRateColumns = useCallback(
    (carrierId: string): ColumnDef<TransportRateByDept>[] => [
      { key: "departmentCode", header: "Département", sortable: true },
      {
        key: "maxWeightKg",
        header: "Poids max (kg)",
        sortable: true,
        cell: (r) => `${toNum(r.maxWeightKg)} kg`,
      },
      {
        key: "price",
        header: "Prix €",
        cell: (r) => toNum(r.price).toFixed(2),
      },
      {
        key: "actions",
        header: "",
        className: "w-[100px]",
        cell: (r) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEditDeptRate(r, carrierId)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeptRateDeleteTarget({ rate: r, carrierId })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditDeptRate],
  );

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Livraison"
        description="Départements, transporteurs et tarifs"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="departments">Départements</TabsTrigger>
          <TabsTrigger value="carriers">Transporteurs</TabsTrigger>
          {carriers.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Departments tab */}
        <TabsContent value="departments" className="mt-4">
          <ConfigDataTable
            data={departments as unknown as Record<string, unknown>[]}
            columns={
              deptColumns as unknown as ColumnDef<
                Record<string, unknown>
              >[]
            }
            searchField="name"
            searchPlaceholder="Rechercher un département…"
            onAdd={openAddDept}
            addLabel="Ajouter un département"
            isLoading={deptsLoading}
          />
        </TabsContent>

        {/* Carriers tab */}
        <TabsContent value="carriers" className="mt-4">
          <ConfigDataTable
            data={carriers as unknown as Record<string, unknown>[]}
            columns={
              carrierColumns as unknown as ColumnDef<
                Record<string, unknown>
              >[]
            }
            searchField="name"
            searchPlaceholder="Rechercher un transporteur…"
            onAdd={openAddCarrier}
            addLabel="Ajouter un transporteur"
            isLoading={carriersLoading}
          />
        </TabsContent>

        {/* Per-carrier rate tabs — two sub-tabs each */}
        {carriers.map((c) => {
          const subTab = carrierSubTabs[c.id] ?? "zone-rates";
          return (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <Tabs
                value={subTab}
                onValueChange={(v) => {
                  setCarrierSubTabs((p) => ({ ...p, [c.id]: v }));
                  if (v === "dept-rates" && !deptRatesMap[c.id]) {
                    fetchDeptRates(c.id);
                  }
                }}
              >
                <TabsList>
                  <TabsTrigger value="zone-rates">Tarifs par zone</TabsTrigger>
                  <TabsTrigger value="dept-rates">
                    Tarifs par département
                    {deptRatesMap[c.id]
                      ? ` (${deptRatesMap[c.id].length}${deptRatesMap[c.id].length >= 500 ? "+" : ""})`
                      : ""}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="zone-rates" className="mt-3">
                  <ConfigDataTable
                    data={(ratesMap[c.id] ?? []) as unknown as Record<string, unknown>[]}
                    columns={buildRateColumns(c.id) as unknown as ColumnDef<Record<string, unknown>>[]}
                    onAdd={() => openAddRate(c.id)}
                    addLabel="Ajouter un tarif zone"
                    isLoading={ratesLoading[c.id] ?? false}
                  />
                </TabsContent>

                <TabsContent value="dept-rates" className="mt-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer par code département (ex : 75, 69)…"
                      className="max-w-xs h-8 text-sm"
                      value={deptRatesSearch[c.id] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDeptRatesSearch((p) => ({ ...p, [c.id]: v }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fetchDeptRates(c.id, deptRatesSearch[c.id]);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchDeptRates(c.id, deptRatesSearch[c.id])}
                    >
                      Rechercher
                    </Button>
                    {(deptRatesSearch[c.id] ?? "") !== "" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeptRatesSearch((p) => ({ ...p, [c.id]: "" }));
                          fetchDeptRates(c.id, "");
                        }}
                      >
                        Effacer
                      </Button>
                    )}
                  </div>
                  <ConfigDataTable
                    data={(deptRatesMap[c.id] ?? []) as unknown as Record<string, unknown>[]}
                    columns={buildDeptRateColumns(c.id) as unknown as ColumnDef<Record<string, unknown>>[]}
                    onAdd={() => openAddDeptRate(c.id)}
                    addLabel="Ajouter un tarif"
                    isLoading={deptRatesLoading[c.id] ?? false}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Department dialog */}
      <ConfigDialog
        open={deptDialogOpen}
        onOpenChange={setDeptDialogOpen}
        title={
          editingDept
            ? "Modifier le département"
            : "Nouveau département"
        }
        onSubmit={(e) => {
          e.preventDefault();
          handleDeptSubmit();
        }}
        onCancel={() => setDeptDialogOpen(false)}
        isSubmitting={isDeptSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dept-code">Code</Label>
            <Input
              id="dept-code"
              value={deptForm.code}
              onChange={(e) =>
                setDeptForm((p) => ({ ...p, code: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name">Nom</Label>
            <Input
              id="dept-name"
              value={deptForm.name}
              onChange={(e) =>
                setDeptForm((p) => ({ ...p, name: e.target.value }))
              }
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dept-zone">Zone</Label>
          <Input
            id="dept-zone"
            type="number"
            min={1}
            max={5}
            value={deptForm.zone}
            onChange={(e) =>
              setDeptForm((p) => ({
                ...p,
                zone: parseInt(e.target.value) || 1,
              }))
            }
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="dept-special"
            checked={deptForm.isSpecialZone}
            onCheckedChange={(v) =>
              setDeptForm((p) => ({ ...p, isSpecialZone: v }))
            }
          />
          <Label htmlFor="dept-special">Zone spéciale</Label>
        </div>
      </ConfigDialog>

      {/* Carrier dialog */}
      <ConfigDialog
        open={carrierDialogOpen}
        onOpenChange={setCarrierDialogOpen}
        title={
          editingCarrier
            ? "Modifier le transporteur"
            : "Nouveau transporteur"
        }
        onSubmit={(e) => {
          e.preventDefault();
          handleCarrierSubmit();
        }}
        onCancel={() => setCarrierDialogOpen(false)}
        isSubmitting={isCarrierSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="carrier-name">Nom</Label>
          <Input
            id="carrier-name"
            value={carrierForm.name}
            onChange={(e) =>
              setCarrierForm((p) => ({ ...p, name: e.target.value }))
            }
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="carrier-active"
            checked={carrierForm.active}
            onCheckedChange={(v) =>
              setCarrierForm((p) => ({ ...p, active: v }))
            }
          />
          <Label htmlFor="carrier-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Rate dialog */}
      <ConfigDialog
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        title={editingRate ? "Modifier le tarif" : "Nouveau tarif"}
        onSubmit={(e) => {
          e.preventDefault();
          handleRateSubmit();
        }}
        onCancel={() => setRateDialogOpen(false)}
        isSubmitting={isRateSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate-zone">Zone</Label>
            <Input
              id="rate-zone"
              type="number"
              min={1}
              max={5}
              value={rateForm.zone}
              onChange={(e) =>
                setRateForm((p) => ({
                  ...p,
                  zone: parseInt(e.target.value) || 1,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-weight">Poids max (kg)</Label>
            <Input
              id="rate-weight"
              type="number"
              value={rateForm.maxWeightKg}
              onChange={(e) =>
                setRateForm((p) => ({
                  ...p,
                  maxWeightKg: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-price">Prix (€)</Label>
          <Input
            id="rate-price"
            type="number"
            step={0.01}
            value={rateForm.price}
            onChange={(e) =>
              setRateForm((p) => ({
                ...p,
                price: parseFloat(e.target.value) || 0,
              }))
            }
            required
          />
        </div>
      </ConfigDialog>

      {/* Delete dialogs */}
      <DeleteConfirmDialog
        open={!!deptDeleteTarget}
        onOpenChange={(open) => !open && setDeptDeleteTarget(null)}
        onConfirm={handleDeleteDept}
        isDeleting={isDeptDeleting}
      />
      <DeleteConfirmDialog
        open={!!carrierDeleteTarget}
        onOpenChange={(open) => !open && setCarrierDeleteTarget(null)}
        onConfirm={handleDeleteCarrier}
        title="Supprimer le transporteur"
        description="Ce transporteur et ses tarifs seront définitivement supprimés."
        isDeleting={isCarrierDeleting}
      />
      <DeleteConfirmDialog
        open={!!rateDeleteTarget}
        onOpenChange={(open) => !open && setRateDeleteTarget(null)}
        onConfirm={handleDeleteRate}
        title="Supprimer le tarif"
        description="Ce tarif sera définitivement supprimé."
        isDeleting={isRateDeleting}
      />

      {/* Dept-Rate dialog */}
      <ConfigDialog
        open={deptRateDialogOpen}
        onOpenChange={setDeptRateDialogOpen}
        title={editingDeptRate ? "Modifier le tarif par département" : "Nouveau tarif par département"}
        onSubmit={(e) => {
          e.preventDefault();
          handleDeptRateSubmit();
        }}
        onCancel={() => setDeptRateDialogOpen(false)}
        isSubmitting={isDeptRateSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="dr-dept">Code département</Label>
          <Input
            id="dr-dept"
            value={deptRateForm.departmentCode}
            onChange={(e) => setDeptRateForm((p) => ({ ...p, departmentCode: e.target.value }))}
            placeholder="ex : 75, 69, 01"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dr-weight">Poids max (kg)</Label>
            <Input
              id="dr-weight"
              type="number"
              step={0.1}
              min={0}
              value={deptRateForm.maxWeightKg || ""}
              onChange={(e) =>
                setDeptRateForm((p) => ({ ...p, maxWeightKg: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dr-price">Prix (€)</Label>
            <Input
              id="dr-price"
              type="number"
              step={0.01}
              min={0}
              value={deptRateForm.price || ""}
              onChange={(e) =>
                setDeptRateForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
        </div>
      </ConfigDialog>

      <DeleteConfirmDialog
        open={!!deptRateDeleteTarget}
        onOpenChange={(open) => !open && setDeptRateDeleteTarget(null)}
        onConfirm={handleDeleteDeptRate}
        title="Supprimer le tarif par département"
        description="Ce tarif sera définitivement supprimé."
        isDeleting={isDeptRateDeleting}
      />
    </div>
  );
}
