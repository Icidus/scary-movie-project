import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ViewingsService } from '@/services/viewings';
import { MoviesService } from '@/services/movies';
import { type TMDBMovie } from '@/services/tmdb';
import { type Ratings, type Movie, type Viewing } from '@/types';
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
    existingViewing?: Viewing;
    trigger?: React.ReactNode;
    onSuccess: () => void;
}

const INITIAL_RATINGS: Ratings = {
    overall: 5,
    enjoyment: 5,
    jump: 5,
    dread: 5,
    gore: 5,
    atmosphere: 5,
    story: 5,
    rewatch: 5,
    wtf: 5,
    cozy: 5
};

export function ViewingForm(props: ViewingFormProps) {
    const { movie, episode, onSuccess, existingViewing } = props;
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [ratings, setRatings] = useState<Ratings>(INITIAL_RATINGS);
    const [watchedAt, setWatchedAt] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [wouldWatchAgain, setWouldWatchAgain] = useState(false);
    const [wouldRecommend, setWouldRecommend] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (existingViewing) {
            setRatings({ ...INITIAL_RATINGS, ...existingViewing.ratings });
            setWatchedAt(existingViewing.watchedAt);
            setNotes(existingViewing.notes || '');
            setWouldWatchAgain(!!existingViewing.toggles?.wouldWatchAgain);
            setWouldRecommend(!!existingViewing.toggles?.wouldRecommend);
            return;
        }

        // New entry
        setRatings(INITIAL_RATINGS);
        setWatchedAt(new Date().toISOString().split('T')[0]);
        setNotes('');
        setWouldWatchAgain(false);
        setWouldRecommend(false);
    }, [open, existingViewing]);

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

            await ViewingsService.upsert({
                id: existingViewing?.id,
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
                {props.trigger || <Button>{existingViewing ? 'Edit Rating' : 'Log Viewing'}</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-secondary/20 sm:rounded-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />
                <DialogHeader>
                    <DialogTitle>
                        {props.episode ? `${existingViewing ? 'Edit' : 'Log'}: ${props.episode.title}` : (existingViewing ? 'Edit Your Rating' : 'Log a Viewing')}
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
                            {loading ? 'Saving...' : (existingViewing ? 'Save Changes' : 'Save Viewing')}
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
}
