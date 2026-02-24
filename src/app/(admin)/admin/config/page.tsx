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
    href: "/admin/config/paper",
    icon: FileText,
    count: "~100 grammages",
  },
  {
    title: "Formats",
    description: "Formats prédéfinis",
    href: "/admin/config/formats",
    icon: Ruler,
    count: "13 formats",
  },
  {
    title: "Couleurs",
    description: "Modes d'impression",
    href: "/admin/config/colors",
    icon: Palette,
    count: "4 modes",
  },
  {
    title: "Façonnage",
    description: "Types de reliure et tarifs",
    href: "/admin/config/finishing",
    icon: Paintbrush,
    count: "4 types",
  },
  {
    title: "Plis",
    description: "Types de pliage et coûts",
    href: "/admin/config/folds",
    icon: Scissors,
    count: "3 types",
  },
  {
    title: "Pelliculage",
    description: "Finitions et tarifs",
    href: "/admin/config/lamination",
    icon: Layers,
    count: "3 finitions",
  },
  {
    title: "Conditionnement",
    description: "Options d'emballage",
    href: "/admin/config/packaging",
    icon: Package,
    count: "5 options",
  },
  {
    title: "Livraison",
    description: "Départements, zones et tarifs",
    href: "/admin/config/delivery",
    icon: Truck,
    count: "100+ départements",
  },
  {
    title: "Coûts Offset",
    description: "Plaques, calage, roulage",
    href: "/admin/config/offset",
    icon: Settings,
    count: "16 paramètres",
  },
  {
    title: "Coûts Numérique",
    description: "Clics, mise en route",
    href: "/admin/config/digital",
    icon: Cpu,
    count: "10 paramètres",
  },
  {
    title: "Marges",
    description: "Pourcentages appliqués",
    href: "/admin/config/margins",
    icon: Percent,
    count: "3 valeurs",
  },
  {
    title: "Machines & Presses",
    description: "Formats machines et diviseurs de clics",
    href: "/admin/config/machines",
    icon: Printer,
    count: "Formats + diviseurs",
  },
];

export default function ConfigOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Moteur de calcul
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de tous les paramètres de tarification
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
              <CardContent>
                <p className="text-xs text-muted-foreground">{cat.count}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
