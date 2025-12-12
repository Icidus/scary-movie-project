
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MoviesService } from '@/services/movies';
import { ViewingsService } from '@/services/viewings';
import type { Movie, Viewing, Ratings } from '@/types';
import { getPosterUrl } from '@/services/tmdb';
import { ViewingForm } from '@/components/ViewingForm';

import { RatingSliders } from '@/components/RatingSliders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersService } from '@/services/users';
import type { UserProfile } from '@/types';
import { UserBadge } from '@/components/UserBadge';
import { FearFingerprint } from '@/components/FearFingerprint';
import { getFunLabel, RATING_KEYS } from '@/lib/rating-utils';

import { useLocation } from 'react-router-dom';

export default function MoviePage() {
    const { tmdbId } = useParams<{ tmdbId: string }>();
    const { user } = useAuth();
    const location = useLocation();
    const isTv = location.pathname.startsWith('/tv/');

    // Unique ID for Firestore (Movies use plain ID, TV uses prefix)
    const docId = isTv && tmdbId ? `tv_${tmdbId}` : tmdbId;

    const [movie, setMovie] = useState<Movie | null>(null);
    const [viewings, setViewings] = useState<Viewing[]>([]);
    const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
    const [loading, setLoading] = useState(true);

    // TV Specific State
    const [activeSeason, setActiveSeason] = useState<number | null>(null);
    const [seasonData, setSeasonData] = useState<any>(null); // Cache season details
    const [loadingSeason, setLoadingSeason] = useState(false);

    const fetchData = async () => {
        if (!tmdbId) return;
        try {
            // Fetch directly like headers does: use upsert logic or getMovie
            // Let's rely on MoviesService to potentially refresh it? 
            if (!docId || !tmdbId) return;

            let m = await MoviesService.getMovie(docId);

            if (!m) {
                // Not in DB? Fetch full details to display (and maybe save?)
                // If we just display, we use the fallback object.
                if (isTv) {
                    const { getTVShowById } = await import('@/services/tmdb');
                    const tmdbShow = await getTVShowById(tmdbId);
                    if (tmdbShow) {
                        m = {
                            tmdbId: tmdbShow.id.toString(),
                            title: tmdbShow.name || 'Unknown Show',
                            year: tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.split('-')[0]) : new Date().getFullYear(),
                            posterPath: tmdbShow.poster_path,
                            backdropPath: tmdbShow.backdrop_path,
                            overview: tmdbShow.overview,
                            tagline: tmdbShow.tagline,
                            runtime: tmdbShow.episode_run_time?.[0] || 0,
                            genres: tmdbShow.genres?.map(g => g.name),
                            mediaType: 'tv',
                            numberOfSeasons: tmdbShow.number_of_seasons,
                            numberOfEpisodes: tmdbShow.number_of_episodes,
                            firstAirDate: tmdbShow.first_air_date,
                            createdBy: 'tmdb',
                            createdAt: new Date().toISOString()
                        } as Movie;
                    }
                } else {
                    const { getMovieById } = await import('@/services/tmdb');
                    const tmdbMovie = await getMovieById(tmdbId);
                    if (tmdbMovie) {
                        m = {
                            tmdbId: tmdbMovie.id.toString(),
                            title: tmdbMovie.title,
                            year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : new Date().getFullYear(),
                            posterPath: tmdbMovie.poster_path,
                            backdropPath: tmdbMovie.backdrop_path,
                            overview: tmdbMovie.overview,
                            tagline: tmdbMovie.tagline,
                            runtime: tmdbMovie.runtime,
                            genres: tmdbMovie.genres?.map(g => g.name),
                            director: tmdbMovie.credits?.crew?.find(c => c.job === 'Director')?.name,
                            cast: tmdbMovie.credits?.cast?.slice(0, 6).map(c => ({
                                name: c.name,
                                role: c.character,
                                profilePath: c.profile_path
                            })),
                            createdBy: 'tmdb',
                            createdAt: new Date().toISOString()
                        } as Movie;
                    }
                }
            } else if (!m.overview) {
                // If in DB but missing metadata (legacy), fetch from TMDB for display
                const { getMovieById } = await import('@/services/tmdb');
                const tmdbMovie = await getMovieById(tmdbId);
                if (tmdbMovie) {
                    m = {
                        ...m,
                        backdropPath: tmdbMovie.backdrop_path,
                        overview: tmdbMovie.overview,
                        tagline: tmdbMovie.tagline,
                        runtime: tmdbMovie.runtime,
                        genres: tmdbMovie.genres?.map(g => g.name),
                        director: tmdbMovie.credits?.crew?.find(c => c.job === 'Director')?.name,
                        cast: tmdbMovie.credits?.cast?.slice(0, 6).map(c => ({
                            name: c.name,
                            role: c.character,
                            profilePath: c.profile_path
                        })),
                    };
                }
            }

            if (m) {
                setMovie(m);
                // Default to season 1 if it's a TV show
                if (m.mediaType === 'tv' && m.numberOfSeasons) {
                    setActiveSeason(1);
                }
            }

            // Fetch Viewings (using docId used for storage)
            const viewingsData = await ViewingsService.listByMovie(docId);
            setViewings(viewingsData);

            // Fetch User Lookups for Chart Labels
            const uids = Array.from(new Set(viewingsData.map(v => v.userId)));
            const profiles: Record<string, UserProfile> = {};
            await Promise.all(uids.map(async (uid) => {
                const p = await UsersService.getProfile(uid);
                if (p) profiles[uid] = p;
            }));
            setUserProfiles(profiles);

        } catch (error) {
            console.error("Failed to fetch movie", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, [tmdbId]);

    // Fetch Season Details when activeSeason changes
    useEffect(() => {
        const fetchSeason = async () => {
            if (!movie || movie.mediaType !== 'tv' || !activeSeason || !movie.tmdbId) return;

            setLoadingSeason(true);
            try {
                const { getSeasonDetails } = await import('@/services/tmdb');
                const season = await getSeasonDetails(movie.tmdbId, activeSeason);
                setSeasonData(season);
            } catch (error) {
                console.error("Failed to fetch season", error);
            } finally {
                setLoadingSeason(false);
            }
        };

        fetchSeason();
    }, [activeSeason, movie?.tmdbId]);

    const averageRatings = useMemo(() => {
        if (viewings.length === 0) return null;
        const keys = Object.keys(viewings[0].ratings) as (keyof Ratings)[];
        const avgs = {} as Ratings;
        keys.forEach(k => {
            const sum = viewings.reduce((acc, curr) => acc + curr.ratings[k], 0);
            avgs[k] = sum / viewings.length;
        });
        return avgs;
    }, [viewings]);

    if (loading) return <div className="p-20 text-center animate-pulse">Summoning details...</div>;
    if (!movie) return <div className="p-20 text-center">Movie not found in the archives.</div>;

    return (
        <div className="min-h-screen pb-20">
            {/* BACKDROP HERO */}
            {/* BACKDROP HERO */}
            <div className="relative min-h-[40vh] md:h-[50vh] w-full overflow-hidden flex items-end">
                {movie.backdropPath && (
                    <img
                        src={`https://image.tmdb.org/t/p/original${movie.backdropPath}`}
                        className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                        alt=""
                    />
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                <div className="relative w-full z-10 p-4 md:p-12 max-w-5xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-end pb-8 md:pb-4 pt-20 md:pt-12">
                    {/* Poster - centered above on mobile, left side on desktop */}
                    <div className="w-40 md:w-48 mx-auto md:mx-0 rounded-lg md:rounded-xl shadow-2xl overflow-hidden border-2 md:border-4 border-background/20 flex-shrink-0">
                        <img src={getPosterUrl(movie.posterPath)} className="w-full" alt={movie.title} />
                    </div>

                    <div className="flex-1 space-y-2 w-full text-center md:text-left">
                        <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md break-words">
                            {movie.title}
                        </h1>
                        <div className="text-sm md:text-2xl font-medium text-white/80 flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4">
                            <span>{movie.year}</span>
                            {movie.runtime && <span className="text-xs md:text-sm px-2 py-0.5 border border-white/30 rounded-full">{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
                            {movie.director && <span className="text-xs md:text-sm text-white/60">Dir. {movie.director}</span>}
                        </div>

                        {movie.tagline && (
                            <p className="text-sm md:text-lg italic text-secondary font-medium mt-2">{movie.tagline}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                            {movie.genres?.map(g => (
                                <Badge key={g} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs md:text-sm">
                                    {g}
                                </Badge>
                            ))}
                        </div>

                        <div className="mt-4 md:mt-6 flex justify-center md:justify-start">
                            {user && <ViewingForm movie={movie} onSuccess={fetchData} />}
                            {!user && <p className="text-white/60 text-xs md:text-sm">Sign in to log this movie.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 md:mt-12 max-w-6xl space-y-12">

                {/* OVERVIEW & CAST */}
                <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8">
                        {/* Plot */}
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold border-b border-primary/20 pb-2 flex items-center gap-2">
                                📖 The Story
                            </h2>
                            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
                                {movie.overview || "No detailed plot available."}
                            </p>
                        </section>

                        {/* Cast */}
                        {movie.cast && movie.cast.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold border-b border-primary/20 pb-2 flex items-center gap-2">
                                    🎭 Starring
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {movie.cast.map((actor, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-card/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                                            <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                                {actor.profilePath ? (
                                                    <img src={`https://image.tmdb.org/t/p/w200${actor.profilePath}`} alt={actor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm">?</div>
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm md:text-base font-bold truncate">{actor.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{actor.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* TV SEASONS SECTION */}
                        {movie.mediaType === 'tv' && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold border-b border-primary/20 pb-2 flex items-center gap-2">
                                    📺 Seasons & Episodes
                                </h2>

                                <Tabs defaultValue={activeSeason?.toString()} onValueChange={(v) => setActiveSeason(parseInt(v))} className="w-full">
                                    <div className="overflow-x-auto pb-2">
                                        <TabsList className="h-auto p-1 bg-muted/20">
                                            {Array.from({ length: movie.numberOfSeasons || 0 }).map((_, i) => (
                                                <TabsTrigger
                                                    key={i + 1}
                                                    value={(i + 1).toString()}
                                                    className="px-4 py-2 min-w-[3rem]"
                                                >
                                                    Season {i + 1}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </div>

                                    <div className="mt-4">
                                        {loadingSeason ? (
                                            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading episodes...</div>
                                        ) : seasonData ? (
                                            <div className="space-y-4">
                                                <div className="flex gap-4 items-start bg-card/30 p-4 rounded-xl border border-primary/10">
                                                    {seasonData.poster_path && (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w200${seasonData.poster_path}`}
                                                            className="w-24 rounded-lg shadow-lg hidden sm:block"
                                                            alt={seasonData.name}
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-xl">{seasonData.name}</h3>
                                                        <p className="text-sm text-muted-foreground mt-1">{seasonData.overview}</p>
                                                        <p className="text-xs font-mono mt-2 text-primary">{seasonData.episodes?.length} Episodes • {seasonData.air_date?.split('-')[0]}</p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-3">
                                                    {seasonData.episodes?.map((episode: any) => (
                                                        <div key={episode.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/20 hover:bg-card/40 transition-colors border border-transparent hover:border-primary/20 group">
                                                            <div className="flex-shrink-0 w-full sm:w-40 md:w-48 aspect-video bg-black/40 rounded overflow-hidden relative">
                                                                {episode.still_path ? (
                                                                    <img src={`https://image.tmdb.org/t/p/w300${episode.still_path}`} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No Image</div>
                                                                )}
                                                                <div className="absolute top-1 left-1 bg-black/60 px-2 py-1 rounded text-xs font-mono text-white">
                                                                    Ep {episode.episode_number}
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <h4 className="text-base md:text-lg font-bold truncate">{episode.name}</h4>
                                                                    <span className="text-sm font-mono opacity-50 whitespace-nowrap">{episode.runtime}m</span>
                                                                </div>
                                                                <p className="text-sm md:text-base text-muted-foreground line-clamp-2 mt-1 mb-2">{episode.overview}</p>

                                                                {/* Log Episode Button */}
                                                                <div className="flex justify-end">
                                                                    {/* Reuse ViewingForm but pass episode details. We need to update ViewingForm first to prop these accept. 
                                                                         For now, just a placeholder or we pass movie but modify title? 
                                                                         Ideally we pass the full episode context. */}
                                                                    {user && (
                                                                        <ViewingForm
                                                                            movie={movie}
                                                                            episode={{
                                                                                seasonNumber: episode.season_number,
                                                                                episodeNumber: episode.episode_number,
                                                                                title: episode.name
                                                                            }}
                                                                            trigger={
                                                                                <button className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 px-3 py-2 rounded-full transition-colors">
                                                                                    ✨ Log Episode
                                                                                </button>
                                                                            }
                                                                            onSuccess={fetchData}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-muted-foreground">Select a season to view episodes.</div>
                                        )}
                                    </div>
                                </Tabs>
                            </section>
                        )}

                        {/* Viewing Log */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    📝 Viewing Log
                                </h2>
                                {user && <ViewingForm movie={movie} onSuccess={fetchData} />}
                            </div>

                            {viewings.length === 0 ? (
                                <p className="text-muted-foreground py-4">No logs yet. Be the first to survive it.</p>
                            ) : (
                                <Tabs defaultValue="comparison" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="comparison">⚡️ Comparison</TabsTrigger>
                                        <TabsTrigger value="individual">👤 Individual Logs</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="comparison" className="mt-0 space-y-8 overflow-hidden">
                                        <Card className="bg-card/30 border-dashed overflow-hidden">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                                    <span>The Fear Fingerprint</span>
                                                    <Badge variant="outline" className="text-[10px] font-normal">VS Mode</Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <FearFingerprint
                                                    datasets={viewings.map((v, i) => {
                                                        const name = userProfiles[v.userId]?.displayName || `User ${v.userId.slice(0, 3)}`;
                                                        return {
                                                            label: name,
                                                            ratings: v.ratings,
                                                            color: ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][i % 5]
                                                        };
                                                    })}
                                                    height={300}
                                                />
                                                <div className="flex flex-wrap gap-2 justify-center mt-4">
                                                    {viewings.map((v, i) => {
                                                        const color = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][i % 5];
                                                        const name = userProfiles[v.userId]?.displayName || `User ${v.userId.slice(0, 3)}`;
                                                        return (
                                                            <div key={v.id} className="flex items-center gap-1.5 text-xs bg-secondary/30 px-2 py-1 rounded-full">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                                <span className="font-medium">{name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {averageRatings && (
                                            <div className="space-y-4 pt-4 border-t border-primary/20">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <span>📊</span> Average Community Ratings
                                                </h3>
                                                <RatingSliders ratings={averageRatings} onChange={() => { }} readOnly />
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="individual" className="space-y-4 mt-0">
                                        {viewings.map((v) => (
                                            <Card key={v.id} className="bg-card/50 overflow-hidden">
                                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <div className="font-bold font-mono text-base text-primary">{v.watchedAt}</div>
                                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                            by <UserBadge userId={v.userId} className="text-foreground" />
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {v.toggles.wouldWatchAgain && <Badge variant="outline" className="text-xs">Rewatchable</Badge>}
                                                        {v.toggles.wouldRecommend && <Badge variant="default" className="text-xs">Recommended</Badge>}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {v.notes && <p className="text-sm md:text-base border-l-2 border-primary/50 pl-4 italic text-foreground/80">"{v.notes}"</p>}

                                                    {/* Mini Fingerprint for individual viewing - Stacked Layout */}
                                                    <div className="mt-4 pt-4 border-t border-secondary/20">
                                                        <p className="text-sm font-bold text-muted-foreground mb-4 uppercase text-center sm:text-left">Individual Stats</p>
                                                        <div className="flex flex-col gap-6">
                                                            {/* Chart on top, wider */}
                                                            <div className="w-full h-64 sm:h-72 bg-background/20 rounded-lg p-2">
                                                                <FearFingerprint
                                                                    datasets={[{ label: 'Rating', ratings: v.ratings, color: '#a855f7' }]}
                                                                    height={240}
                                                                    showLegend={false}
                                                                />
                                                            </div>
                                                            {/* Detailed List below */}
                                                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-base px-2">
                                                                {RATING_KEYS.map(({ key, label }) => (
                                                                    <div key={key} className="flex flex-col border-b border-primary/10 pb-3 last:border-0 break-inside-avoid">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="font-bold text-muted-foreground text-sm sm:text-base">{label}</span>
                                                                            <span className="font-mono font-black text-xl sm:text-2xl text-primary">{v.ratings[key]}</span>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground italic overflow-hidden text-ellipsis whitespace-nowrap">
                                                                            {getFunLabel(key, v.ratings[key])}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            )}
                        </section>
                    </div>


                    {/* Sidebar Stats */}
                    <div className="space-y-8">
                        <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/20 text-center space-y-2 sticky top-24">
                            <h4 className="font-bold text-base md:text-lg text-secondary">Is it scary?</h4>
                            <p className="text-3xl md:text-4xl font-black">
                                {averageRatings?.overall ? averageRatings.overall.toFixed(1) : "?"}/10
                            </p>
                            <p className="text-sm text-muted-foreground">Based on {viewings.length} survivor logs</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
