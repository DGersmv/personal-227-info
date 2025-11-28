/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
    // Игнорируем предупреждения о критических зависимостях в web-ifc
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;
    
    // Игнорируем предупреждения для web-ifc библиотек
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /web-ifc/,
        message: /Critical dependency/,
      },
    ];

    return config;
  },
};

module.exports = nextConfig;



