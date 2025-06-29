import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any) => {
    // 处理Vditor的动态导入问题
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  // 添加静态文件重写规则
  async rewrites() {
    return [
      {
        source: '/vditor/:path*',
        destination: '/node_modules/vditor/dist/:path*',
      },
    ];
  },
};

export default nextConfig;
