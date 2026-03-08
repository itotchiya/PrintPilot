'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Palette, FileText, CheckCircle, Building2 } from 'lucide-react';

export default function SupplierBrandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    primaryColor: '#3B8BEB',
    address: '',
    phone: '',
    website: '',
  });

  useEffect(() => {
    fetchBrandingData();
  }, []);

  const fetchBrandingData = async () => {
    try {
      const response = await fetch('/api/supplier/branding');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          companyName: data.companyName || '',
          primaryColor: data.primaryColor || '#3B8BEB',
          address: data.address || '',
          phone: data.phone || '',
          website: data.website || '',
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch branding data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('companyName', formData.companyName);
      formDataToSend.append('primaryColor', formData.primaryColor);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('website', formData.website);
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      const response = await fetch('/api/supplier/branding', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to save branding');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
          <p className="text-sm text-muted-foreground">
            Customize your company branding for professional PDF quotes
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your branding has been saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Upload your logo to appear on PDF quotes (PNG, JPG, or SVG)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div 
                className="h-32 w-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: formData.primaryColor + '10' }}
              >
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoChange}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended size: 400x400px, Max 2MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              This information will appear on your PDF quotes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street, City, Country"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>
              Customize the colors used in your PDF quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    id="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 font-mono"
                    placeholder="#3B8BEB"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for headers, buttons, and accent elements
                </p>
              </div>

              {/* Preview */}
              <div className="mt-4 p-6 rounded-lg border" style={{ backgroundColor: formData.primaryColor + '10' }}>
                <div className="flex items-center gap-4 mb-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      {formData.companyName.charAt(0) || 'L'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold" style={{ color: formData.primaryColor }}>
                      {formData.companyName || 'Your Company'}
                    </h4>
                    <p className="text-sm text-muted-foreground">Quote #001</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 rounded" style={{ backgroundColor: formData.primaryColor + '30' }} />
                  <div className="h-2 w-1/2 rounded" style={{ backgroundColor: formData.primaryColor + '20' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Quote Preview
            </CardTitle>
            <CardDescription>
              This is how your quotes will look to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-8 bg-white">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 pb-4 border-b">
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain" />
                  ) : (
                    <div 
                      className="h-16 w-16 rounded flex items-center justify-center text-white text-2xl font-bold"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      {formData.companyName.charAt(0) || 'L'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: formData.primaryColor }}>
                      {formData.companyName || 'Your Company Name'}
                    </h2>
                    {formData.address && (
                      <p className="text-sm text-muted-foreground">{formData.address}</p>
                    )}
                    {(formData.phone || formData.website) && (
                      <p className="text-sm text-muted-foreground">
                        {formData.phone} {formData.phone && formData.website && '·'} {formData.website}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold">QUOTE</h3>
                  <p className="text-sm text-muted-foreground">#QT-2024-001</p>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Quote Details */}
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">Brochure A4, 500 copies</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">1,250.00 MAD</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-bold" style={{ color: formData.primaryColor }}>Total</span>
                  <span className="font-bold text-xl" style={{ color: formData.primaryColor }}>
                    1,450.00 MAD
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                <p>Thank you for your business!</p>
                <p>Quote valid for 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.push('/supplier/dashboard')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Branding'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
