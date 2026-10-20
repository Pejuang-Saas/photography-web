import Landing from './landing';
import { getLandingCmsContent } from '@/lib/landing-cms';
import {
  getLandingContent,
  getPublicPackageCategories,
  getPublicPackages,
  getPublicPaymentSettings,
  getStudioInfo,
} from '@/lib/landing-data';
import { QueryProvider } from '@/lib/query-provider';

// Rendered on each request, not once at build time. A build runs where the API cannot be reached
// (nothing is deployed yet), so a page built then would hold an empty catalog until it was next
// revalidated. The data itself is still cached for a minute by `fetchPublic`.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [cmsContent, content, studio, packages, packageCategories, paymentSettings] =
    await Promise.all([
      getLandingCmsContent(),
      getLandingContent(),
      getStudioInfo(),
      getPublicPackages(),
      getPublicPackageCategories(),
      getPublicPaymentSettings(),
    ]);

  return (
    <QueryProvider>
      <Landing
        cmsContent={cmsContent}
        content={content}
        studio={studio}
        packages={packages}
        packageCategories={packageCategories}
        allowDownPayment={paymentSettings?.allowDownPayment ?? true}
      />
    </QueryProvider>
  );
}
