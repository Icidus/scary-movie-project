
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ViewingsService } from '@/services/viewings';
import { MoviesService } from '@/services/movies';
import type { Viewing, Movie } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsersService } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { getPosterUrl } from '@/services/tmdb';
import { Link } from 'react-router-dom';
import { ViewingForm } from '@/components/ViewingForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import type { UserColorKey } from '@/types';
import { USER_COLOR_KEYS, userColorKeyToCss } from '@/lib/user-colors';

export default function UserPage() {
    const { uid } = useParams<{ uid: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewings, setViewings] = useState<Viewing[]>([]);
    const [moviesData, setMoviesData] = useState<Record<string, Movie>>({});
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!uid) return;
        try {
            const data = await ViewingsService.listByUser(uid);
            setViewings(data);

            const movieIds = Array.from(new Set(data.map(v => v.movieId)));
            const moviePromises = movieIds.map(id => MoviesService.getMovie(id));
            const moviesResults = await Promise.all(moviePromises);

            const movieMap: Record<string, Movie> = {};
            moviesResults.forEach((m, i) => {
                const movieId = movieIds[i];
                if (m && movieId) movieMap[movieId] = m;
            });
            setMoviesData(movieMap);

        } catch (error) {
            console.error("Failed to load user history", error);
        } finally {
            setLoading(false);
        }
    }, [uid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { user, userProfile } = useAuth(); // Needed to check permissions
    const isOwner = user?.uid === uid;
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const [newColorKey, setNewColorKey] = useState<UserColorKey | null>(null);

    const editRequested = useMemo(() => searchParams.get('edit') === '1', [searchParams]);

    useEffect(() => {
        if (editRequested && isOwner) {
            setIsEditing(true);
        }
    }, [editRequested, isOwner]);

    useEffect(() => {
        if (!isEditing) return;
        if (!user) return;
        setNewName(userProfile?.displayName || user.displayName || '');
        setNewPhotoUrl((userProfile ? (userProfile.photoURL ?? '') : (user.photoURL ?? '')));
        setNewColorKey((userProfile?.colorKey ?? null) as UserColorKey | null);
    }, [isEditing, user, userProfile]);

    const handleUpdateProfile = async () => {
        if (!user || !newName.trim()) return;
        try {
            await updateProfile(user, {
                displayName: newName.trim(),
                photoURL: newPhotoUrl.trim() || null,
            });
            await UsersService.updateProfile(user.uid, {
                displayName: newName.trim(),
                photoURL: newPhotoUrl.trim() || null,
                colorKey: newColorKey ?? null,
            });
            setIsEditing(false);
            // Clear deep-link param if present
            if (searchParams.get('edit')) {
                searchParams.delete('edit');
                setSearchParams(searchParams, { replace: true });
            }
        } catch (e) {
            console.error("Failed to update profile", e);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading history...</div>;

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">User History</h1>
                {isOwner && (
                    <Dialog
                        open={isEditing}
                        onOpenChange={(open) => {
                            setIsEditing(open);
                            if (!open && searchParams.get('edit')) {
                                searchParams.delete('edit');
                                setSearchParams(searchParams, { replace: true });
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline">Edit Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-xl sm:rounded-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
                            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />
                            <DialogHeader>
                                <DialogTitle>Edit Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage
                                            src={
                                                newPhotoUrl ||
                                                (userProfile ? (userProfile.photoURL ?? '') : (user?.photoURL ?? ''))
                                            }
                                            alt={newName || userProfile?.displayName || user?.displayName || ''}
                                        />
                                        <AvatarFallback>{(newName || userProfile?.displayName || user?.displayName || 'U')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold truncate">{user?.email}</div>
                                        <div className="text-xs text-muted-foreground">Shown in the header + logs</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Display Name</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Dad, Captain Spooky..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Photo URL</Label>
                                    <Input
                                        value={newPhotoUrl}
                                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                                        placeholder="https://..."
                                        inputMode="url"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                    <p className="text-xs text-muted-foreground">Firebase can store a profile image URL. For uploading images from the app, we’d add Firebase Storage.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Chart Color</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {USER_COLOR_KEYS.map((key) => {
                                            const isSelected = newColorKey === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setNewColorKey(key)}
                                                    aria-label={`Select color ${key}`}
                                                    aria-pressed={isSelected}
                                                    className={
                                                        isSelected
                                                            ? 'h-10 w-10 rounded-full border-2 border-ring ring-2 ring-ring/30'
                                                            : 'h-10 w-10 rounded-full border border-border/70'
                                                    }
                                                    style={{ backgroundColor: userColorKeyToCss(key) }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Used for your Fear Fingerprint + review highlights.</p>
                                </div>

                                <Button onClick={handleUpdateProfile} className="w-full">Save Changes</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {viewings.length === 0 ? (
                <p className="text-muted-foreground">No ratings logged yet.</p>
            ) : (
                <div className="grid gap-4">
                    {viewings.map(v => {
                        const movie = moviesData[v.movieId];
                        return (
                            <Card key={v.id} className="overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Thumbnail */}
                                    <div className="w-full sm:w-24 h-32 flex-shrink-0 bg-muted">
                                        {movie ? (
                                            <Link to={movie.mediaType === 'tv' ? `/tv/${movie.tmdbId}` : `/movie/${movie.tmdbId}`}>
                                                <img
                                                    src={getPosterUrl(movie.posterPath)}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                                                />
                                            </Link>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">Loading...</div>
                                        )}
                                    </div>

                                    <div className="flex-grow p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg">
                                                    {movie ? (
                                                        <Link
                                                            to={movie.mediaType === 'tv' ? `/tv/${movie.tmdbId}` : `/movie/${movie.tmdbId}`}
                                                            className="hover:underline"
                                                        >
                                                            {movie.title}
                                                        </Link>
                                                    ) : 'Unknown Movie'}
                                                </h3>
                                                <div className="text-sm text-muted-foreground">{v.watchedAt}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-bold leading-none">{v.ratings.overall}</span>
                                                    <span className="text-xs text-muted-foreground">Scare</span>
                                                    {typeof v.ratings.enjoyment === 'number' && (
                                                        <span className="text-xs text-muted-foreground">Enjoy: {v.ratings.enjoyment.toFixed(1)}</span>
                                                    )}
                                                </div>
                                                {isOwner && movie && (
                                                    <ViewingForm movie={movie} existingViewing={v} onSuccess={fetchData} trigger={<Button size="sm" variant="outline">Edit</Button>} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {v.toggles.wouldWatchAgain && <Badge variant="outline" className="text-xs">Watch Again</Badge>}
                                            {v.toggles.wouldRecommend && <Badge variant="default" className="text-xs">Recommended</Badge>}
                                        </div>

                                        {v.notes && <p className="text-sm italic text-muted-foreground line-clamp-2">{v.notes}</p>}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
