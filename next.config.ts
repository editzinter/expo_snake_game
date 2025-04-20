import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Add this to address the cross-origin warning
  allowedDevOrigins: [
    'localhost',
    '192.168.29.247'
  ]
};

export default nextConfig;
