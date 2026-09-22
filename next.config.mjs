import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.fallback = {
        ...config.fallback,
        fs: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    return config;
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
