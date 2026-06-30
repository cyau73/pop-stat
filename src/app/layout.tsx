// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/global.css'; // Or your global Tailwind styles path

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Property Management & Population Dashboard',
    description: 'Real-time demographic tracking system',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
            </body>
        </html>
    );
}