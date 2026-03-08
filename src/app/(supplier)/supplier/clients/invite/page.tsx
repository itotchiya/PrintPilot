'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Send, CheckCircle, Loader2, Mail, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const invitationSchema = z.object({
  email: z.string().email('Veuillez saisir une adresse e-mail valide'),
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').optional(),
  notes: z.string().optional(),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export default function InviteClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    email: string;
    name?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      name: '',
      notes: '',
    },
  });

  const onSubmit = async (data: InvitationFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          type: 'CLIENT',
          name: data.name,
          notes: data.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible d'envoyer l'invitation");
      }

      setSuccess({
        email: data.email,
        name: data.name,
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/supplier/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inviter un client</h1>
          <p className="text-muted-foreground">
            Envoyer une invitation à un nouveau client
          </p>
        </div>
      </div>

      {/* Success State */}
      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <p className="font-medium">Invitation envoyée avec succès !</p>
            <p className="text-sm mt-1">
              Un e-mail d&apos;invitation a été envoyé à {success.email}.
              Le client recevra un lien pour créer son compte et commencer à générer des devis avec vos tarifs.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuccess(null)}
              >
                Inviter un autre client
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/supplier/clients')}
              >
                Voir mes clients
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!success && (
        <>
          {/* Info Card */}
          <Card className="bg-muted/50 border">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Comment ça se passe ?</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>1. Le client reçoit un e-mail d&apos;invitation avec un lien sécurisé</li>
                    <li>2. Il clique sur le lien et crée son compte</li>
                    <li>3. Il peut immédiatement générer des devis avec vos tarifs</li>
                    <li>4. Vous serez notifié(e) lorsqu&apos;il génère des devis ou télécharge des PDF</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées du client</CardTitle>
              <CardDescription>
                Saisissez les informations du client pour lui envoyer une invitation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="client@example.com"
                      className="pl-10"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nom du client (facultatif)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="ex. : Jean Dupont"
                      className="pl-10"
                      {...form.register('name')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permet de l&apos;identifier facilement dans votre liste de clients
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes privées (facultatif)</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="notes"
                      placeholder="Any notes about this client (only visible to you)"
                      className="pl-10 min-h-[100px]"
                      {...form.register('notes')}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/supplier/clients')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer l&apos;invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Conseils pour inviter vos clients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>Informez le client qu&apos;il recevra un e-mail de noreply@mail.mbouf.site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>L&apos;invitation expire dans 7 jours — le client doit l&apos;accepter rapidement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>Une fois inscrit, il peut immédiatement générer des devis avec vos tarifs</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
