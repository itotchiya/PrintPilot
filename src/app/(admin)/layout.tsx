import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DefaultConfigAlert } from "@/components/layout/DefaultConfigAlert";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden px-4 py-6 md:px-8">
        <DefaultConfigAlert />
        {children}
      </main>
    </div>
  );
}
