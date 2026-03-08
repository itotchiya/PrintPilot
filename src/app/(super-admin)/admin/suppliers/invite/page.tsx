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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Send, CheckCircle, Loader2, Building2, Mail } from 'lucide-react';
import Link from 'next/link';

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export default function InviteSupplierPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    email: string;
    companyName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      companyName: '',
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
          type: 'SUPPLIER',
          companyName: data.companyName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setSuccess({
        email: data.email,
        companyName: data.companyName,
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
          <Link href="/admin/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invite Supplier</h1>
          <p className="text-sm text-muted-foreground">
            Send an email invitation to a new printing supplier
          </p>
        </div>
      </div>

      {/* Success State */}
      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Invitation sent successfully!</p>
            <p className="text-sm mt-1">
              An invitation email has been sent to {success.email} for {success.companyName}.
              They will have 7 days to accept the invitation and create their account.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuccess(null)}
              >
                Invite Another
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/admin/suppliers')}
              >
                View Suppliers
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
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">What happens next?</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>1. The supplier receives an invitation email with a secure link</li>
                    <li>2. They click the link and create their account</li>
                    <li>3. They complete the onboarding wizard with pre-filled demo values</li>
                    <li>4. They can start inviting their own clients</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Details</CardTitle>
              <CardDescription>
                Enter the supplier&apos;s information to send them an invitation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="e.g., Bayeux Printing"
                      className="pl-10"
                      {...form.register('companyName')}
                    />
                  </div>
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="supplier@example.com"
                      className="pl-10"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The invitation link will be sent to this email address
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/suppliers')}
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
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitation
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
              <CardTitle className="text-base">Tips for Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>Make sure to inform the supplier that they&apos;ll receive an email from noreply@mail.mbouf.site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>The invitation expires in 7 days - they should accept it promptly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>After they sign up, you can help them configure their pricing or let them use the defaults</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
