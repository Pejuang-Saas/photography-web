import Landing from './landing';
import { getLandingCmsContent } from '@/lib/landing-cms';

export default async function Home() {
  const cmsContent = await getLandingCmsContent();

  return <Landing cmsContent={cmsContent} />;
}
