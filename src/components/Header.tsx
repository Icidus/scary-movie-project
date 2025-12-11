
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Ghost, LogOut, User as UserIcon, Search, Loader2 } from 'lucide-react';
import { searchMovies, type TMDBMovie, getPosterUrl } from '@/services/tmdb';
import { useDebounce } from '@/hooks/useDebounce';

export function Header() {
    const { user, signIn, logout } = useAuth();
    const navigate = useNavigate();

    // Search State
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TMDBMovie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const debouncedQuery = useDebounce(query, 500);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Debounced Search Effect
    // 1. Initial Search (New Query)
    useEffect(() => {
        const performSearch = async () => {
            setPage(1);
            setHasMore(true);

            if (!debouncedQuery.trim()) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const movies = await searchMovies(debouncedQuery, 1);
                setResults(movies);
                setShowDropdown(true);
                // If we got < 20 results (default page size), there are no more pages
                setHasMore(movies.length >= 20);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    // 2. Load More (Pagination)
    useEffect(() => {
        const loadMoreMovies = async () => {
            if (page === 1) return; // Already handled by initial search
            if (!debouncedQuery.trim()) return;

            setIsSearching(true);
            try {
                const movies = await searchMovies(debouncedQuery, page);
                setResults(prev => [...prev, ...movies]);
                setHasMore(movies.length >= 20);
            } catch (error) {
                console.error("Load more failed", error);
            } finally {
                setIsSearching(false);
            }
        };

        loadMoreMovies();
    }, [page]); // Only trigger when page changes

    // 3. Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isSearching) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isSearching]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectMovie = async (movie: TMDBMovie) => {
        setShowDropdown(false);
        setQuery(''); // Clear search after selection

        // Navigate to appropriate route
        if (movie.media_type === 'tv') {
            navigate(`/tv/${movie.id}`);
        } else {
            navigate(`/movie/${movie.id}`);
        }
    };

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-3 font-bold text-xl h-full group">
                        <div className="relative">
                            <Ghost className="h-7 w-7 text-primary transition-transform duration-500 ease-in-out group-hover:-translate-y-1 group-hover:rotate-12" />
                            {/* Little decorative glow behind ghost */}
                            <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="hidden md:block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-black tracking-tight">
                            Dad & Lily’s Horror Log <span className="text-xs bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent font-bold tracking-wide drop-shadow-[0_0_3px_rgba(236,72,153,0.5)] ml-1">(and sometimes Mom)</span>
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link to="/" className="transition-colors hover:text-foreground/80">Home</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Search Bar - Visible on Mobile now */}
                    <div className="relative w-full max-w-sm" ref={dropdownRef}>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search..."
                                className="pl-9 h-9 w-[150px] sm:w-[200px] lg:w-[300px] transition-all bg-muted/50 focus:bg-background focus:w-[180px] sm:focus:w-[250px] lg:focus:w-[300px]"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>

                        {/* Search Portal Overlay - FIXED POSITIONING */}
                        {showDropdown && results.length > 0 && (
                            <div className="fixed top-16 left-0 right-0 h-[calc(100vh-4rem)] bg-background/80 backdrop-blur-sm z-50 flex justify-center items-start pt-10 animate-in fade-in duration-200">
                                <div className="w-[90vw] max-w-5xl bg-popover border border-primary/20 shadow-2xl rounded-2xl p-8 overflow-y-auto max-h-[80vh]">
                                    <div className="flex items-center gap-2 mb-6 text-primary font-bold tracking-widest uppercase text-xs opacity-70 border-b border-primary/10 pb-2">
                                        <span className="animate-pulse">🔮</span> The Portal Opens...
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                        {results.map((movie, index) => (
                                            <div
                                                key={movie.id}
                                                onClick={() => handleSelectMovie(movie)}
                                                className="group cursor-pointer relative flex flex-col gap-2"
                                                style={{
                                                    animation: `fade-up 0.4s ease-out forwards`,
                                                    animationDelay: `${index * 50}ms`,
                                                    opacity: 0
                                                }}
                                            >
                                                {/* Poster Container */}
                                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg transition-all duration-300 transform group-hover:-translate-y-2 group-hover:rotate-1 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] bg-black/40">
                                                    {movie.poster_path ? (
                                                        <img
                                                            src={getPosterUrl(movie.poster_path)}
                                                            alt={movie.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted p-2 text-center text-xs">
                                                            No Poster
                                                        </div>
                                                    )}

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="text-white font-bold text-sm bg-primary/80 px-3 py-1 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                            Summon
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <div className="text-center group-hover:text-primary transition-colors">
                                                    <h4 className="font-bold text-sm leading-tight line-clamp-2">{movie.title || movie.name}</h4>
                                                    <div className="flex items-center justify-center gap-2 mt-1">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {(movie.release_date || movie.first_air_date || '').split('-')[0]}
                                                        </span>
                                                        {movie.media_type === 'tv' && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30">
                                                                TV
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sentinel & Loader */}
                                    <div ref={observerTarget} className="w-full flex justify-center py-6 mt-4 opacity-50">
                                        {hasMore && (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        )}
                                        {!hasMore && results.length > 0 && (
                                            <span className="text-xs text-muted-foreground">End of the line...</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                                        <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <Link to="/" className="text-xl font-bold tracking-tighter text-foreground flex items-center gap-2 group">
                                        <span className="text-2xl group-hover:-translate-y-1 transition-transform duration-300">👻</span>
                                        <span className="hidden md:block">Dad & Lily’s Horror Log <span className="text-xs bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent font-bold tracking-wide drop-shadow-[0_0_3px_rgba(236,72,153,0.5)] ml-1">(and sometimes Mom)</span></span>
                                    </Link>            </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/u/${user.uid}`)}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Your History</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button onClick={signIn} size="sm">
                            Sign In
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
