
import { Card } from "@/components/ui/card";
import type { Movie } from "@/types";
import { getPosterUrl } from "@/services/tmdb";
import { Link } from "react-router-dom";

interface MovieCardProps {
    movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
    // Determine dots based on averages (mock logic if specific breakdown isn't passed, 
    // but ideally 'averages' should have more data. For MVP we use mock or overall).
    // The user requested: jump(🔥), atmosphere(🌫️), dread(😬), gore(🩸).
    // Since we only pass 'overall' and 'scare' here currently, we will assume high score = fire for now 
    // or just show overall with a fun icon. 
    // TODO: Pass full ratings breakdown to MovieCard for accurate dots.

    // For now, let's just make it look cool with the overall score.

    const href = movie.mediaType === 'tv' ? `/tv/${movie.tmdbId}` : `/movie/${movie.tmdbId}`;

    return (
        <Link to={href} className="block h-full group">
            <Card className="overflow-hidden border-0 bg-transparent h-full flex flex-col relative text-left transition-all duration-300 hover:-translate-y-1">
                {/* Poster with Glow */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    <img
                        src={getPosterUrl(movie.posterPath)}
                        alt={movie.title}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />

                    {/* Score Badges */}
                    {typeof movie.enjoymentAverage === 'number' && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                            <span className="text-xs">⭐</span>
                            <span className={`font-black text-sm ${(movie.enjoymentAverage || 0) >= 8 ? 'text-red-400' :
                                (movie.enjoymentAverage || 0) >= 6 ? 'text-purple-400' : 'text-muted-foreground'
                                }`}>
                                {movie.enjoymentAverage.toFixed(1)}
                            </span>
                        </div>
                    )}

                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                        <span className="text-xs">👻</span>
                        <span className={`font-black text-sm ${(movie.overallAverage || 0) >= 8 ? 'text-red-400' :
                            (movie.overallAverage || 0) >= 6 ? 'text-purple-400' : 'text-muted-foreground'
                            }`}>
                            {movie.overallAverage ? movie.overallAverage.toFixed(1) : '-'}
                        </span>
                    </div>
                </div>

                <div className="mt-3 space-y-1 px-1">
                    <h3 className="font-bold leading-tight truncate text-foreground/90 group-hover:text-primary transition-colors">
                        {movie.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">{movie.year}</p>
                </div>
            </Card>
        </Link>
    );
}
