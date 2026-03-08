import { redirect } from 'next/navigation';

// Redirect to main admin dashboard — this page is deprecated
export default function SuperAdminDashboardPage() {
  redirect('/admin');
}
