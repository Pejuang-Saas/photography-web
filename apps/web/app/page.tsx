import Landing from './landing';
import { getLandingCmsContent } from '@/lib/landing-cms';
import {
  getLandingContent,
  getPublicPackages,
  getPublicPaymentSettings,
  getStudioInfo,
} from '@/lib/landing-data';
import { QueryProvider } from '@/lib/query-provider';

export default async function Home() {
  const [cmsContent, content, studio, packages, paymentSettings] = await Promise.all([
    getLandingCmsContent(),
    getLandingContent(),
    getStudioInfo(),
    getPublicPackages(),
    getPublicPaymentSettings(),
  ]);

  return (
    <QueryProvider>
      <Landing
        cmsContent={cmsContent}
        content={content}
        studio={studio}
        packages={packages}
        allowDownPayment={paymentSettings?.allowDownPayment ?? true}
      />
    </QueryProvider>
  );
}
