import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Ghost } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4 space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Ghost className="w-32 h-32 text-primary animate-bounce relative z-10" />
            </div>

            <div className="space-y-2 z-10">
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent">
                    404
                </h1>
                <h2 className="text-2xl font-bold text-white">Lost in the Mists?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    The page you are looking for has been claimed by the void. Turn back while you still can.
                </p>
            </div>

            <Link to="/">
                <Button size="lg" className="font-bold text-lg px-8 py-6 rounded-full group">
                    Escape to Safety
                </Button>
            </Link>
        </div>
    );
}
