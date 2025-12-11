
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

export default function UserPage() {
    const { uid } = useParams<{ uid: string }>();
    const [viewings, setViewings] = useState<Viewing[]>([]);
    const [moviesData, setMoviesData] = useState<Record<string, Movie>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!uid) return;
            try {
                const data = await ViewingsService.listByUser(uid);
                setViewings(data);

                // Fetch associated movies
                // Dedup movieIds
                const movieIds = Array.from(new Set(data.map(v => v.movieId)));
                const moviePromises = movieIds.map(id => MoviesService.getMovie(id));
                const moviesResults = await Promise.all(moviePromises);

                const movieMap: Record<string, Movie> = {};
                moviesResults.forEach(m => {
                    if (m) movieMap[m.tmdbId] = m;
                });
                setMoviesData(movieMap);

            } catch (error) {
                console.error("Failed to load user history", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [uid]);

    const { user } = useAuth(); // Needed to check permissions
    const isOwner = user?.uid === uid;
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');

    const handleUpdateProfile = async () => {
        if (!user || !newName.trim()) return;
        try {
            await UsersService.updateProfile(user.uid, { displayName: newName });
            setIsEditing(false);
            // Reload page or re-fetch profile would be ideal, but for now just close.
            // A refresh context or signal would be better but keeping it simple.
            window.location.reload();
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
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Edit Profile</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Display Name</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Dad, Captain Spooky..."
                                    />
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
                                            <Link to={`/movie/${movie.tmdbId}`}>
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
                                                    {movie ? <Link to={`/movie/${movie.tmdbId}`} className="hover:underline">{movie.title}</Link> : 'Unknown Movie'}
                                                </h3>
                                                <div className="text-sm text-muted-foreground">{v.watchedAt}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-bold leading-none">{v.ratings.overall}</span>
                                                    <span className="text-xs text-muted-foreground">Overall</span>
                                                </div>
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
