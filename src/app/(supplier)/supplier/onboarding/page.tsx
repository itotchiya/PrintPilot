'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Building2, 
  Settings, 
  Palette, 
  Users, 
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with PrintQuote',
    icon: Sparkles,
  },
  {
    id: 'company',
    title: 'Company Info',
    description: 'Set up your business details',
    icon: Building2,
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Customize your look',
    icon: Palette,
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Review your pricing setup',
    icon: Settings,
  },
  {
    id: 'invite',
    title: 'Invite Clients',
    description: 'Add your first client',
    icon: Users,
  },
];

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phone: '',
    website: '',
    primaryColor: '#3B8BEB',
    clientEmail: '',
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      // TODO: Save all onboarding data
      await fetch('/api/supplier/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      router.push('/supplier/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {steps[currentStep].title}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CurrentStepIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-6 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to PrintQuote!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You&apos;re just a few steps away from allowing your clients to generate 
                  instant quotes with your pricing. We&apos;ve pre-filled everything with 
                  demo values - just review and adjust as needed.
                </p>
              </div>

              <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">What&apos;s included:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✓ Pre-configured pricing (based on industry standards)</li>
                    <li>✓ Professional PDF quote templates</li>
                    <li>✓ Client invitation system</li>
                    <li>✓ Real-time quote generation</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Company Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
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
            </div>
          )}

          {/* Step 3: Branding */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Brand Color</Label>
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
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This color will be used on your PDF quotes
                </p>
              </div>

              <div className="p-6 rounded-lg border" style={{ backgroundColor: formData.primaryColor + '10' }}>
                <h4 className="font-bold mb-4" style={{ color: formData.primaryColor }}>
                  {formData.companyName || 'Your Company'}
                </h4>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 rounded" style={{ backgroundColor: formData.primaryColor }} />
                  <div className="h-2 w-1/2 rounded" style={{ backgroundColor: formData.primaryColor + '50' }} />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can upload your logo and further customize branding later in the Branding section.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 4: Pricing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">Demo Pricing Loaded</p>
                  <p className="text-sm mt-1">
                    We&apos;ve pre-filled your pricing with industry-standard demo values. 
                    Review these carefully and adjust them to match your actual costs.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Offset Printing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plate Cost</span>
                      <span className="font-medium">10.00 MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calage Cost</span>
                      <span className="font-medium">50.00 MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Markup</span>
                      <span className="font-medium">1.3x</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Digital Printing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">B&W Click</span>
                      <span className="font-medium">0.02 MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Color Click</span>
                      <span className="font-medium">0.08 MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Markup</span>
                      <span className="font-medium">1.5x</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                You can update all pricing details after completing onboarding in the Configuration section.
              </p>
            </div>
          )}

          {/* Step 5: Invite Client */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <h3 className="text-lg font-medium mb-2">Almost done!</h3>
                <p className="text-muted-foreground">
                  Invite your first client to start generating quotes with your pricing.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email Address</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="client@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  They&apos;ll receive an invitation to create an account and generate quotes with your pricing.
                </p>
              </div>

              <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  After completing onboarding, you can invite more clients from the Clients section.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Completing...
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Complete Setup
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
