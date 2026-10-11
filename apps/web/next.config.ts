import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['localhsot-3000.jong.my.id'],
  images: {
    // In dev the S3 URL is localhost:9001, which the container-side optimizer can neither reach nor
    // is allowed to fetch (private IP); let the browser load it directly. Production keeps optimization.
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      ...(() => {
        const publicUrl = process.env.S3_PUBLIC_URL ?? 'http://localhost:9001/photography-assets';
        try {
          const url = new URL(publicUrl);
          return [{ protocol: url.protocol.replace(':', '') as 'http' | 'https', hostname: url.hostname, port: url.port, pathname: `${url.pathname}/**` }];
        } catch {
          return [];
        }
      })(),
    ],
  },
};

export default nextConfig;
