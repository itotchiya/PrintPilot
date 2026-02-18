import { DashboardHeader } from "@/components/layout/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
