"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FOURNISSEUR: "Fournisseur",
  ACHETEUR: "Acheteur",
  CLIENT: "Client",
  ADMIN: "Administrateur",
  EMPLOYEE: "Employé",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FOURNISSEUR",
  });

  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      toast.success("Utilisateur créé");
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "", role: "FOURNISSEUR" });
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (deleteConfirmText !== userToDelete.name) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      toast.success("Utilisateur supprimé");
      setUserToDelete(null);
      setDeleteConfirmText("");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Utilisateurs"
        description="Créer et gérer les comptes Fournisseur et Acheteur"
        actionLabel="Créer un utilisateur"
        onAction={() => setDialogOpen(true)}
        itemCount={users.length}
      />

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role !== "SUPER_ADMIN" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteConfirmText("");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Créer un utilisateur"
        onSubmit={handleSubmit}
        onCancel={() => setDialogOpen(false)}
        isSubmitting={submitting}
        submitLabel="Créer"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-name">Nom</Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="user-password">Mot de passe</Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div>
            <Label>Rôle</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOURNISSEUR">Fournisseur</SelectItem>
                <SelectItem value="ACHETEUR">Acheteur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ConfigDialog>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Pour confirmer la suppression de l'utilisateur <strong>{userToDelete?.name}</strong>, veuillez taper son nom complet ci-dessous :
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="confirm-name" className="sr-only">Nom de l'utilisateur</Label>
            <Input
              id="confirm-name"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={userToDelete?.name}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmText !== userToDelete?.name}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
