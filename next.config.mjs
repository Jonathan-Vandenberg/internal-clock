/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
                ],
            },
        ];
    },

    webpack(config, options) {
        const { isServer } = options;
        config.module.rules.push({
            test: /\.(ogg|mp3|wav|mpe?g)$/i,
            exclude: config.exclude,
            use: [
                {
                    loader: 'url-loader',
                    options: {
                        limit: config.inlineImageLimit,
                        fallback: 'file-loader',
                        publicPath: `${config.assetPrefix}/_next/static/images/`,
                        outputPath: `${isServer ? '../' : ''}static/images/`,
                        name: '[name]-[hash].[ext]',
                        esModule: config.esModule || false,
                    },
                },
            ],
        });

        return config;
    },
};

export default nextConfig;
