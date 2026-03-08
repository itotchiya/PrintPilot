import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Palette,
  Ruler,
  Paintbrush,
  Scissors,
  Layers,
  Package,
  Truck,
  Settings,
  Cpu,
  Percent,
  Printer,
} from "lucide-react";
import Link from "next/link";

const configCategories = [
  {
    title: "Papiers",
    description: "Types de papier et grammages",
    href: "/supplier/config/paper",
    icon: FileText,
  },
  {
    title: "Formats",
    description: "Formats prédéfinis",
    href: "/supplier/config/formats",
    icon: Ruler,
  },
  {
    title: "Couleurs",
    description: "Modes d'impression",
    href: "/supplier/config/colors",
    icon: Palette,
  },
  {
    title: "Façonnage",
    description: "Types de reliure et tarifs",
    href: "/supplier/config/finishing",
    icon: Paintbrush,
  },
  {
    title: "Plis",
    description: "Types de pliage et coûts",
    href: "/supplier/config/folds",
    icon: Scissors,
  },
  {
    title: "Pelliculage",
    description: "Finitions et tarifs",
    href: "/supplier/config/lamination",
    icon: Layers,
  },
  {
    title: "Conditionnement",
    description: "Options d'emballage",
    href: "/supplier/config/packaging",
    icon: Package,
  },
  {
    title: "Livraison",
    description: "Départements, zones et tarifs",
    href: "/supplier/config/delivery",
    icon: Truck,
  },
  {
    title: "Coûts Offset",
    description: "Plaques, calage, roulage",
    href: "/supplier/config/offset",
    icon: Settings,
  },
  {
    title: "Coûts Numérique",
    description: "Clics, mise en route",
    href: "/supplier/config/digital",
    icon: Cpu,
  },
  {
    title: "Marges",
    description: "Pourcentages appliqués",
    href: "/supplier/config/margins",
    icon: Percent,
  },
  {
    title: "Machines & Presses",
    description: "Formats machines et diviseurs de clics",
    href: "/supplier/config/machines",
    icon: Printer,
  },
];

export default function SupplierConfigOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos paramètres de tarification et de production
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {configCategories.map((cat) => (
          <Link key={cat.href} href={cat.href} className="group">
            <Card className="transition-colors group-hover:border-primary/30">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <cat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {cat.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {cat.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
