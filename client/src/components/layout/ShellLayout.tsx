import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const ShellLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex w-full flex-col">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 bg-slate-50/60 px-4 py-6 lg:px-10">
                    <div className="mx-auto max-w-7xl 2xl:max-w-full space-y-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ShellLayout;

