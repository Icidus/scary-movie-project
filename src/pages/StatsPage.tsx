import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Movie, Ratings, Viewing } from '@/types';
import { ViewingsService } from '@/services/viewings';
import { MoviesService } from '@/services/movies';
import { getPosterUrl } from '@/services/tmdb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RATING_KEYS } from '@/lib/rating-utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

type RankedRow = {
    id: string;
    title: string;
    subtitle?: string;
    link?: string;
    posterPath?: string | null;
    count: number;
    averages: Ratings;
};

function emptyRatings(): Ratings {
    return {
        overall: 0,
        enjoyment: 0,
        jump: 0,
        dread: 0,
        gore: 0,
        atmosphere: 0,
        story: 0,
        rewatch: 0,
        wtf: 0,
        cozy: 0,
    };
}

function isTvMovieId(movieId: string) {
    return movieId.startsWith('tv_');
}

export default function StatsPage() {
    const [loading, setLoading] = useState(true);
    const [viewings, setViewings] = useState<Viewing[]>([]);
    const [moviesById, setMoviesById] = useState<Record<string, Movie | null>>({});

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            setLoading(true);
            try {
                const all = await ViewingsService.listAll(1000);
                if (!mounted) return;
                setViewings(all);

                const ids = Array.from(new Set(all.map(v => v.movieId).filter(Boolean)));
                const results = await Promise.all(ids.map(id => MoviesService.getMovie(id)));
                if (!mounted) return;
                const map: Record<string, Movie | null> = {};
                ids.forEach((id, idx) => {
                    map[id] = results[idx] ?? null;
                });
                setMoviesById(map);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, []);

    const grouped = useMemo(() => {
        type Agg = { count: number; sums: Ratings };

        const addToAgg = (agg: Agg, r: Ratings) => {
            agg.count += 1;
            for (const { key } of RATING_KEYS) {
                agg.sums[key] += r[key];
            }
        };

        const toAverages = (agg: Agg): Ratings => {
            const avg = emptyRatings();
            const denom = agg.count || 1;
            for (const { key } of RATING_KEYS) {
                avg[key] = Math.round((agg.sums[key] / denom) * 10) / 10;
            }
            return avg;
        };

        const movieAgg: Record<string, Agg> = {};
        const tvAgg: Record<string, Agg> = {};
        const episodeAgg: Record<string, Agg> = {};

        for (const v of viewings) {
            const movieId = v.movieId;
            if (!movieId) continue;

            const movie = moviesById[movieId] ?? null;
            const isTv = movie?.mediaType === 'tv' || isTvMovieId(movieId);

            // Movies + TV cumulative
            const targetMap = isTv ? tvAgg : movieAgg;
            if (!targetMap[movieId]) targetMap[movieId] = { count: 0, sums: emptyRatings() };
            addToAgg(targetMap[movieId], v.ratings);

            // Episodes (per episode) rankings
            if (isTv && v.seasonNumber != null && v.episodeNumber != null) {
                const epKey = `${movieId}::s${v.seasonNumber}e${v.episodeNumber}`;
                if (!episodeAgg[epKey]) episodeAgg[epKey] = { count: 0, sums: emptyRatings() };
                addToAgg(episodeAgg[epKey], v.ratings);
            }
        }

        const movieRows: RankedRow[] = Object.entries(movieAgg).map(([movieId, agg]) => {
            const m = moviesById[movieId] ?? null;
            const title = m?.title || movieId;
            const link = m?.tmdbId ? `/movie/${m.tmdbId}` : undefined;
            return {
                id: movieId,
                title,
                subtitle: m?.year ? String(m.year) : undefined,
                link,
                posterPath: m?.posterPath,
                count: agg.count,
                averages: toAverages(agg),
            };
        });

        const tvRows: RankedRow[] = Object.entries(tvAgg).map(([movieId, agg]) => {
            const m = moviesById[movieId] ?? null;
            const title = m?.title || movieId;
            const link = m?.tmdbId ? `/tv/${m.tmdbId}` : undefined;
            return {
                id: movieId,
                title,
                subtitle: m?.year ? String(m.year) : undefined,
                link,
                posterPath: m?.posterPath,
                count: agg.count,
                averages: toAverages(agg),
            };
        });

        const episodeRows: RankedRow[] = Object.entries(episodeAgg).map(([epKey, agg]) => {
            const [movieId, epPart] = epKey.split('::');
            const m = moviesById[movieId] ?? null;

            const match = /^s(\d+)e(\d+)$/.exec(epPart || '');
            const season = match ? Number(match[1]) : undefined;
            const episode = match ? Number(match[2]) : undefined;

            // Attempt to find a representative viewing for episode title
            const sample = viewings.find(v => v.movieId === movieId && v.seasonNumber === season && v.episodeNumber === episode);
            const episodeTitle = sample?.episodeTitle;

            const subtitleParts: string[] = [];
            if (season != null && episode != null) subtitleParts.push(`S${season}E${episode}`);
            if (episodeTitle) subtitleParts.push(episodeTitle);

            const title = m?.title || movieId;
            const link = m?.tmdbId ? `/tv/${m.tmdbId}` : undefined;

            return {
                id: epKey,
                title,
                subtitle: subtitleParts.join(' — ') || undefined,
                link,
                posterPath: m?.posterPath,
                count: agg.count,
                averages: toAverages(agg),
            };
        });

        return { movieRows, tvRows, episodeRows };
    }, [moviesById, viewings]);

    function Rankings({ rows }: { rows: RankedRow[] }) {
        const [metricKey, setMetricKey] = useState<(typeof RATING_KEYS)[number]['key']>(RATING_KEYS[0].key);
        const metricLabel = RATING_KEYS.find(r => r.key === metricKey)?.label ?? 'Rating';

        const sorted = useMemo(() => {
            return [...rows]
                .filter(r => r.count > 0)
                .sort((a, b) => b.averages[metricKey] - a.averages[metricKey])
                .slice(0, 10);
        }, [rows, metricKey]);

        return (
            <div className="w-full">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <span className="truncate max-w-[14rem]">{metricLabel}</span>
                                <ChevronDown className="h-4 w-4 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto">
                            {RATING_KEYS.map(({ key, label }) => (
                                <DropdownMenuItem
                                    key={key}
                                    onSelect={() => setMetricKey(key)}
                                    className={key === metricKey ? 'font-semibold' : undefined}
                                >
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4">
                    {sorted.length === 0 ? (
                        <p className="text-muted-foreground">No logs yet.</p>
                    ) : (
                        <div className="grid gap-3">
                            {sorted.map((r, idx) => {
                                const content = (
                                    <Card className="bg-card/50 overflow-hidden">
                                        <CardContent className="p-3 grid grid-cols-[2.5rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3">
                                            <div className="text-center font-mono text-sm text-muted-foreground whitespace-nowrap">#{idx + 1}</div>

                                            <div className="h-14 w-11 rounded bg-muted overflow-hidden">
                                                {r.posterPath ? (
                                                    <img
                                                        src={getPosterUrl(r.posterPath)}
                                                        alt={r.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : null}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="font-bold leading-tight line-clamp-2 break-words">{r.title}</div>
                                                {r.subtitle && <div className="text-xs text-muted-foreground leading-snug line-clamp-2 break-words">{r.subtitle}</div>}
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="text-[10px]">{r.count} log{r.count === 1 ? '' : 's'}</Badge>
                                                </div>
                                            </div>

                                            <div className="text-right whitespace-nowrap">
                                                <div className="font-mono font-black text-xl text-primary leading-none">
                                                    {r.averages[metricKey].toFixed(1)}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">avg</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );

                                return r.link ? (
                                    <Link key={r.id} to={r.link} className="block">
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={r.id}>{content}</div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading stats…</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6 max-w-4xl overflow-x-hidden">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold">Stats</h1>
                <p className="text-sm text-muted-foreground">Rankings based on your family’s logs.</p>
            </div>

            <Tabs defaultValue="movies" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="movies">🎬 Movies</TabsTrigger>
                    <TabsTrigger value="tv">📺 TV Shows</TabsTrigger>
                    <TabsTrigger value="episodes">🧩 Episodes</TabsTrigger>
                </TabsList>

                <TabsContent value="movies" className="mt-6">
                    <Card className="bg-card/30">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Movie Rankings</CardTitle>
                        </CardHeader>
                        <CardContent><Rankings rows={grouped.movieRows} /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tv" className="mt-6">
                    <Card className="bg-card/30">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">TV Show Rankings (Cumulative)</CardTitle>
                        </CardHeader>
                        <CardContent><Rankings rows={grouped.tvRows} /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="episodes" className="mt-6">
                    <Card className="bg-card/30">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Episode Rankings (Per Episode)</CardTitle>
                        </CardHeader>
                        <CardContent><Rankings rows={grouped.episodeRows} /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
