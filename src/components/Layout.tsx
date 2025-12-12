import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function Layout() {
    const location = useLocation();
    const navigationType = useNavigationType();

    const transitionClass =
        navigationType === 'POP'
            ? 'animate-in fade-in slide-in-from-left-4 duration-300 ease-out'
            : 'animate-in fade-in slide-in-from-right-4 duration-300 ease-out';

    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <Header />
            <main className="overflow-x-hidden">
                <div
                    key={location.key}
                    className={cn('motion-reduce:animate-none will-change-transform', transitionClass)}
                >
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
