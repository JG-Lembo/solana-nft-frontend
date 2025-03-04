/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    webpack: (config, { isServer }) => {
        // Fixes npm packages that depend on `fs` module
        if (!isServer) {
            config.resolve = {
                ...config.resolve,
                fallback: {
                    fs: false
                }
            }
        }
    
        return config
    }
};

module.exports = nextConfig;
