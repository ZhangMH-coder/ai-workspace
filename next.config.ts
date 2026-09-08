import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 旧的四类能力占位页统一并入 Capability Asset Hub（按类型预筛选）
  async redirects() {
    return [
      { source: "/skills", destination: "/capabilities?type=skill", permanent: true },
      { source: "/memory", destination: "/capabilities?type=memory", permanent: true },
      { source: "/rules", destination: "/capabilities?type=rule", permanent: true },
      { source: "/tools", destination: "/capabilities?type=tool", permanent: true },
    ];
  },
};

export default nextConfig;
