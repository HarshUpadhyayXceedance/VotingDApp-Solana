'use client';

import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface AppLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    showFooter?: boolean;
}

export function AppLayout({ children, sidebar, showFooter = true }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
            {/* Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <div className="flex flex-1">
                {/* Sidebar (if provided) */}
                {sidebar && (
                    <div className="hidden lg:block">
                        {sidebar}
                    </div>
                )}

                {/* Main Content */}
                <main className={`flex-1 ${sidebar ? 'lg:ml-0' : ''}`}>
                    {children}
                </main>
            </div>

            {/* Footer */}
            {showFooter && <Footer />}
        </div>
    );
}
