const nextConfig = {
    // Satisfies the "Blocked cross-origin request" warning
    allowedDevOrigins: ['mac-mini.tail0f16ec.ts.net', 'mac-mini.tail0f16ec.ts.net:3000'],

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                pathname: '/**',
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "20mb",
            // This is the correct property name for Next.js 16
            allowedOrigins: ["mac-mini.tail0f16ec.ts.net", "mac-mini.tail0f16ec.ts.net.key:3000"],
        },
    },
};

export default nextConfig;