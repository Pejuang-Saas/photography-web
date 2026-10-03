import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['localhsot-3000.jong.my.id'],
  images: {
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
