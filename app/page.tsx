import { redirect } from 'next/navigation';
import { getCurrentUser, isFirstAdminNeeded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (isFirstAdminNeeded()) {
    redirect('/setup');
  }

  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}

