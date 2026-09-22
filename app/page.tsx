import { supabase } from '../lib/supabase';
import ClientHome from '../components/ClientHome';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [factsRes, requestsRes] = await Promise.all([
    supabase.from('facts').select('*').order('published_at', { ascending: false }),
    supabase.from('requests').select('*').order('created_at', { ascending: false })
  ]);

  const facts = factsRes.data || [];
  const requests = requestsRes.data || [];

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 md:p-8">
      <ClientHome initialFacts={facts} initialRequests={requests} />
    </main>
  );
}