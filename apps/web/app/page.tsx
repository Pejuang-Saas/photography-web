import Landing from './landing';
import { getLandingCmsContent } from '@/lib/landing-cms';
import { QueryProvider } from '@/lib/query-provider';

export default async function Home() {
  const cmsContent = await getLandingCmsContent();

  return (
    <QueryProvider>
      <Landing cmsContent={cmsContent} />
    </QueryProvider>
  );
}
