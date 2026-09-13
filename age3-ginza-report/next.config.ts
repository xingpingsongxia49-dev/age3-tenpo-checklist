import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 親フォルダにも別アプリのロックファイルがあるため、このアプリを基準だと明示する
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
