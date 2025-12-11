import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ViewingsService } from '@/services/viewings';
import { MoviesService } from '@/services/movies';
import { type TMDBMovie } from '@/services/tmdb';
import { type Ratings, type Movie } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RatingSliders } from './RatingSliders';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ViewingFormProps {
    movie: Movie;
    episode?: {
        seasonNumber: number;
        episodeNumber: number;
        title: string;
    };
    trigger?: React.ReactNode;
    onSuccess: () => void;
}

const INITIAL_RATINGS: Ratings = {
    overall: 5, jump: 5, dread: 5, gore: 5, atmosphere: 5,
    story: 5, rewatch: 5, wtf: 5, cozy: 5
};

export function ViewingForm(props: ViewingFormProps) {
    const { movie, episode, onSuccess } = props;
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [ratings, setRatings] = useState<Ratings>(INITIAL_RATINGS);
    const [watchedAt, setWatchedAt] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [wouldWatchAgain, setWouldWatchAgain] = useState(false);
    const [wouldRecommend, setWouldRecommend] = useState(false);

    const handleRatingChange = (key: keyof Ratings, value: number) => {
        setRatings(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Ensure movie exists in DB (Preview Mode support)
            // We construct a partial TMDBMovie - upsertFromTMDB will fetch full details if needed
            // or we could overload upsert. For now, this is robust.
            const tmdbStub = {
                id: Number(movie.tmdbId),
                title: movie.title,
                release_date: movie.year.toString(),
                poster_path: movie.posterPath,
                overview: movie.overview || '',
                media_type: movie.mediaType || 'movie' // Pass media type so upsert prefixes ID correctly
            } as TMDBMovie;

            await MoviesService.upsertFromTMDB(tmdbStub, user.uid);

            // Construct the persistent ID (same logic as Movie page and upsert)
            const persistenceId = (movie.mediaType === 'tv' && !movie.tmdbId.startsWith('tv_'))
                ? `tv_${movie.tmdbId}`
                : movie.tmdbId;

            await ViewingsService.add({
                movieId: persistenceId,
                userId: user.uid,
                watchedAt,
                ratings,
                toggles: { wouldWatchAgain, wouldRecommend },
                notes: notes.trim(),
                // TV / Episode Metadata
                mediaType: episode ? 'episode' : (movie.mediaType || 'movie'),
                seasonNumber: episode?.seasonNumber,
                episodeNumber: episode?.episodeNumber,
                episodeTitle: episode?.title
            });
            setOpen(false);
            onSuccess();
        } catch (error) {
            console.error("Failed to log viewing", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {props.trigger || <Button>Log Viewing</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-secondary/20">
                <DialogHeader>
                    <DialogTitle>
                        {props.episode ? `Log: ${props.episode.title}` : 'Log a Viewing'}
                        {props.episode && <span className="block text-sm font-normal text-muted-foreground mt-1">S{props.episode.seasonNumber} • E{props.episode.episodeNumber}</span>}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date Watched</Label>
                        <input
                            type="date"
                            id="date"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={watchedAt}
                            onChange={(e) => setWatchedAt(e.target.value)}
                            required
                        />
                    </div>

                    <RatingSliders ratings={ratings} onChange={handleRatingChange} />

                    <div className="flex gap-8">
                        <div className="flex items-center space-x-2">
                            <Switch id="again" checked={wouldWatchAgain} onCheckedChange={setWouldWatchAgain} />
                            <Label htmlFor="again">Watch Again?</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="recommend" checked={wouldRecommend} onCheckedChange={setWouldRecommend} />
                            <Label htmlFor="recommend">Recommend?</Label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                            placeholder="Thoughts, reactions..."
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Viewing'}
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
}
