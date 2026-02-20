import { InteractiveGradient } from "@/components/ui/interactive-gradient";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-8">
      <div className="flex w-full max-w-[1000px] overflow-hidden rounded-3xl bg-background shadow-xl ring-1 ring-border/5">
        
        {/* Left side: Interactive Gradient & Logo */}
        <div className="relative hidden w-1/2 overflow-hidden p-10 lg:flex flex-col justify-between">
          <InteractiveGradient />
          
          <div className="relative z-10 flex items-center gap-2">
            <Logo className="w-[150px] h-[40px]" />
          </div>

          <div className="relative z-10 mt-auto">
            <p className="mb-2 text-sm font-medium text-primary">Vous pouvez facilement</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground/90 leading-tight">
              Gérer vos devis d'impression et votre production avec fluidité.
            </h1>
          </div>
        </div>

        {/* Right side: Form */}
        <div className="flex w-full flex-col justify-center p-8 sm:p-12 lg:w-1/2">
          {children}
        </div>

      </div>
    </div>
  );
}
