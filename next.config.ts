import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack 및 개발 서버 사설 IP 접속 허용
  allowedDevOrigins: ['localhost:3000', '192.168.0.39:3000'],
};

export default nextConfig;