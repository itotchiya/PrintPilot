import { redirect } from 'next/navigation';

// Redirect to main config — default config is now managed through per-category config pages
export default function DefaultConfigPage() {
  redirect('/admin/config');
}
