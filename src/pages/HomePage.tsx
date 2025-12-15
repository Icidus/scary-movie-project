import { useEffect, useState } from 'react';
import { MoviesService } from '@/services/movies';
import type { Movie } from '@/types';
import { MovieCard } from '@/components/MovieCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function HomePage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const [recsOpen, setRecsOpen] = useState(false);
    const [recsLoading, setRecsLoading] = useState(false);
    const [recsError, setRecsError] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<Movie[]>([]);

    async function loadRecommendations() {
        setRecsLoading(true);
        setRecsError(null);
        try {
            const viewingsData = await import('@/services/viewings').then(m => m.ViewingsService.getAllViewings());
            const seenDocIds = new Set(viewingsData.map(v => v.movieId));

            const recent = [...viewingsData]
                .filter(v => !!v.movieId)
                .sort((a, b) => (b.watchedAt || '').localeCompare(a.watchedAt || ''))
                .slice(0, 50);

            const byMovie: Record<string, { sum: number; count: number; latest: string }> = {};
            for (const v of recent) {
                const key = v.movieId;
                if (!key) continue;
                if (!byMovie[key]) byMovie[key] = { sum: 0, count: 0, latest: v.watchedAt || '' };
                byMovie[key].sum += v.ratings?.enjoyment ?? v.ratings?.overall ?? 0;
                byMovie[key].count += 1;
                if ((v.watchedAt || '') > byMovie[key].latest) byMovie[key].latest = v.watchedAt || '';
            }

            const seeds = Object.entries(byMovie)
                .map(([movieId, stats]) => ({
                    movieId,
                    avg: stats.count ? stats.sum / stats.count : 0,
                    latest: stats.latest
                }))
                .sort((a, b) => (b.avg - a.avg) || b.latest.localeCompare(a.latest))
                .slice(0, 3)
                .map(s => s.movieId);

            if (seeds.length === 0) {
                setRecommendations([]);
                return;
            }

            const { getMovieRecommendationsById, getTVRecommendationsById } = await import('@/services/tmdb');

            const recs: any[] = [];
            await Promise.all(seeds.map(async (seedDocId) => {
                const isTV = seedDocId.startsWith('tv_');
                const tmdbId = isTV ? seedDocId.slice(3) : seedDocId;
                const items = isTV
                    ? await getTVRecommendationsById(tmdbId)
                    : await getMovieRecommendationsById(tmdbId);
                recs.push(...items);
            }));

            const unique: Movie[] = [];
            const used = new Set<string>();

            // Keep recommendations in-scope for this app.
            // TMDB genre ids are stable: Horror=27, Thriller=53, Mystery=9648.
            const allowedGenreIds = new Set<number>([27, 53, 9648]);
            for (const r of recs) {
                const mediaType = (r.media_type === 'tv' ? 'tv' : 'movie') as 'tv' | 'movie';
                const docId = mediaType === 'tv' ? `tv_${r.id}` : r.id.toString();

                const genreIds: number[] = Array.isArray(r.genre_ids) ? r.genre_ids : [];
                // If we don't have genre ids, skip to avoid off-theme picks.
                if (genreIds.length === 0) continue;
                if (!genreIds.some((gid) => allowedGenreIds.has(gid))) continue;

                if (!r.poster_path) continue;
                if (seenDocIds.has(docId)) continue;
                if (used.has(docId)) continue;
                used.add(docId);

                const releaseDate = r.release_date || r.first_air_date;
                const year = releaseDate ? parseInt(String(releaseDate).split('-')[0]) : new Date().getFullYear();

                unique.push({
                    tmdbId: String(r.id),
                    title: r.title || r.name || 'Unknown Title',
                    year,
                    posterPath: r.poster_path,
                    backdropPath: r.backdrop_path,
                    overview: r.overview,
                    createdBy: 'tmdb',
                    createdAt: new Date().toISOString(),
                    mediaType,
                });

                if (unique.length >= 12) break;
            }

            setRecommendations(unique);
        } catch (error) {
            console.error('Failed to load recommendations', error);
            setRecsError('Could not load recommendations right now.');
            setRecommendations([]);
        } finally {
            setRecsLoading(false);
        }
    }

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
                const enjoymentMap: Record<string, { total: number; count: number }> = {};
                viewingsData.forEach(v => {
                    if (!ratingsMap[v.movieId]) ratingsMap[v.movieId] = { total: 0, count: 0 };
                    ratingsMap[v.movieId].total += v.ratings.overall;
                    ratingsMap[v.movieId].count += 1;

                    if (!enjoymentMap[v.movieId]) enjoymentMap[v.movieId] = { total: 0, count: 0 };
                    enjoymentMap[v.movieId].total += (v.ratings.enjoyment ?? v.ratings.overall);
                    enjoymentMap[v.movieId].count += 1;
                });

                // Merge into movies
                const mergedMovies = moviesData.map(m => {
                    const statsKey = m.mediaType === 'tv' ? `tv_${m.tmdbId}` : m.tmdbId;
                    const stats = ratingsMap[statsKey];
                    const computedAverage = stats ? stats.total / stats.count : undefined;

                    const enjoymentStats = enjoymentMap[statsKey];
                    const computedEnjoymentAverage = enjoymentStats ? enjoymentStats.total / enjoymentStats.count : undefined;

                    // If we have a computed average but it's missing in the doc, we could update it (optional background)
                    return {
                        ...m,
                        overallAverage: m.overallAverage ?? computedAverage,
                        enjoymentAverage: m.enjoymentAverage ?? computedEnjoymentAverage,
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

    useEffect(() => {
        if (!recsOpen) return;
        // Load on open, but don't refetch if we already have results.
        if (recommendations.length > 0 || recsLoading) return;
        loadRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recsOpen]);

    const filterText = filter.trim().toLowerCase();
    const filteredMovies = movies.filter(m => {
        const matches = m.title.toLowerCase().includes(filterText);
        if (!matches) return false;
        return true;
    });

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

                <Button
                    type="button"
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => setRecsOpen(true)}
                >
                    Recommendations
                </Button>
            </div>

            <Dialog open={recsOpen} onOpenChange={setRecsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-secondary/20 sm:rounded-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <DialogHeader>
                        <DialogTitle>Recommended next watches</DialogTitle>
                        <DialogDescription>
                            Based on what we’ve enjoyed recently.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={recsLoading}
                            onClick={loadRecommendations}
                        >
                            {recsLoading ? 'Loading…' : 'Refresh'}
                        </Button>
                        {recsError && (
                            <span className="text-sm text-destructive">{recsError}</span>
                        )}
                    </div>

                    {recsLoading && recommendations.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">Finding picks…</div>
                    ) : recommendations.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">No fresh picks found yet.</div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {recommendations.map((movie) => (
                                <div key={`${movie.mediaType ?? 'movie'}_${movie.tmdbId}`} onClick={() => setRecsOpen(false)}>
                                    <MovieCard movie={movie} />
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
