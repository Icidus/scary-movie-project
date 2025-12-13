import { useEffect, useState } from 'react';
import { MoviesService } from '@/services/movies';
import type { Movie } from '@/types';
import { MovieCard } from '@/components/MovieCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function HomePage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch movies and viewings in parallel
                const [moviesData, viewingsData] = await Promise.all([
                    MoviesService.listRecent(),
                    import('@/services/viewings').then(m => m.ViewingsService.getAllViewings())
                ]);

                // Calculate averages map
                const ratingsMap: Record<string, { total: number; count: number }> = {};
                viewingsData.forEach(v => {
                    if (!ratingsMap[v.movieId]) ratingsMap[v.movieId] = { total: 0, count: 0 };
                    ratingsMap[v.movieId].total += v.ratings.overall;
                    ratingsMap[v.movieId].count += 1;
                });

                // Merge into movies
                const mergedMovies = moviesData.map(m => {
                    const statsKey = m.mediaType === 'tv' ? `tv_${m.tmdbId}` : m.tmdbId;
                    const stats = ratingsMap[statsKey];
                    const computedAverage = stats ? stats.total / stats.count : undefined;

                    // If we have a computed average but it's missing in the doc, we could update it (optional background)
                    return {
                        ...m,
                        overallAverage: m.overallAverage ?? computedAverage
                    };
                });

                setMovies(mergedMovies);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const filteredMovies = movies.filter(m =>
        m.title.toLowerCase().includes(filter.toLowerCase())
    );

    const [title, setTitle] = useState("Fresh Screams");

    useEffect(() => {
        const titles = [
            "Fresh Screams",
            "Tonight’s Terrors",
            "Latest Hauntings",
            "Our Most Recent Victims",
            "What We've Watched Together"
        ];
        setTitle(titles[Math.floor(Math.random() * titles.length)]);
    }, []);

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 gap-4 border-b pb-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {title}
                    </h1>
                    <p className="text-muted-foreground font-medium">Your shared horror collection 👻</p>
                </div>

                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter shelf..."
                        className="pl-8 w-full md:w-[300px]"
                        value={filter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">Loading...</div>
            ) : filteredMovies.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">No movies found. Add one by searching!</div>
            ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredMovies.map(movie => (
                        <MovieCard key={movie.tmdbId} movie={movie} />
                    ))}
                </div>
            )}
        </div>
    );
}
