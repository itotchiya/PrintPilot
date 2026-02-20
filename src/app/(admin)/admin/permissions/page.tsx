"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Fournisseur {
  id: string;
  name: string;
}

interface AcheteurRow {
  id: string;
  name: string;
  email: string;
  fournisseurIds: string[];
  fournisseurs: { id: string; name: string }[];
}

export default function AdminPermissionsPage() {
  const [acheteurs, setAcheteurs] = useState<AcheteurRow[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/permissions");
    if (!res.ok) return;
    const data = await res.json();
    setAcheteurs(data.acheteurs ?? []);
    setFournisseurs(data.fournisseurs ?? []);
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const toggle = async (acheteurId: string, fournisseurId: string, checked: boolean) => {
    setUpdating(acheteurId);
    try {
      if (checked) {
        const res = await fetch("/api/admin/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acheteurId, fournisseurId }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error);
        }
      } else {
        const res = await fetch(
          `/api/admin/permissions?acheteurId=${encodeURIComponent(acheteurId)}&fournisseurId=${encodeURIComponent(fournisseurId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Erreur");
      }
      toast.success(checked ? "Accès ajouté" : "Accès retiré");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Permissions"
        description="Définir quels Fournisseurs chaque Acheteur peut utiliser pour comparer les devis"
      />

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Acheteur</TableHead>
                {fournisseurs.map((f) => (
                  <TableHead key={f.id} className="text-center min-w-[100px]">
                    {f.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {acheteurs.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                  </TableCell>
                  {fournisseurs.map((f) => {
                    const hasAccess = a.fournisseurIds.includes(f.id);
                    return (
                      <TableCell key={f.id} className="text-center">
                        <Checkbox
                          checked={hasAccess}
                          onCheckedChange={(checked) =>
                            toggle(a.id, f.id, checked === true)
                          }
                          disabled={updating === a.id}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && acheteurs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Aucun Acheteur. Créez des utilisateurs avec le rôle Acheteur depuis la page Utilisateurs.
          </div>
        )}
      </div>
    </div>
  );
}
