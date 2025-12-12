import { db } from '@/lib/firebase';
import { removeUndefined } from '@/lib/utils';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    collection,
    query,
    limit,
    orderBy,
    getDocs
} from 'firebase/firestore';
import type { TMDBMovie } from './tmdb';
import type { Movie } from '@/types';

export const MoviesService = {
    async upsertFromTMDB(tmdbMovie: TMDBMovie, userId: string): Promise<Movie> {
        // TV Shows get a prefix to avoid ID collisions with Movies
        const docId = tmdbMovie.media_type === 'tv' ? `tv_${tmdbMovie.id}` : tmdbMovie.id.toString();
        const tmdbId = tmdbMovie.id.toString();

        const docRef = doc(db, 'movies', docId);

        // We always fetch fresh data from TMDB to ensure we have credits/details, 
        // even if the doc exists (optional: could skip if exists, but for now let's update it to backfill content)
        // actually, let's respect existing docs to save reads, but we might need a migration strategy later.
        // For this specific request "add way more metadata", we should probably update it if it's missing metadata.
        const snap = await getDoc(docRef);
        const existingData = snap.exists() ? (snap.data() as Movie) : null;

        // If we have detailed metadata already, return it.
        if (existingData && existingData.overview && existingData.cast) {
            return existingData;
        }

        // Fetch full details including credits
        // We import getMovieById dynamically or move it to avoid circular deps if needed, 
        // but it's in tmdb.ts which is fine.
        // Wait, to avoid circular import issues if any, let's assume imports are fine.
        // But we need to import getMovieById.
        // We need to import getMovieById and getTVShowById dynamically
        const { getMovieById, getTVShowById } = await import('./tmdb');

        // Determine type and fetch full details
        let fullMovie: TMDBMovie | null = null;
        if (tmdbMovie.media_type === 'tv') {
            fullMovie = await getTVShowById(tmdbId);
        } else {
            fullMovie = await getMovieById(tmdbId);
        }

        if (!fullMovie) throw new Error("Could not fetch full media details");

        const releaseDate = fullMovie.release_date || fullMovie.first_air_date;
        const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;

        // Handle crew/cast for both (TV puts creators in created_by usually, but credits are similar)
        const director = fullMovie.credits?.crew.find(c => c.job === 'Director')?.name ||
            (fullMovie as any).created_by?.[0]?.name; // TV specific

        const cast = fullMovie.credits?.cast.slice(0, 10).map(c => ({
            name: c.name,
            role: c.character,
            profilePath: c.profile_path
        })) || [];

        const newMovie: Movie = {
            ...existingData, // preserve creator info if existing
            tmdbId, // This remains the numeric/string TMDB ID
            // We might want to store the internal ID? No, the ID is the key.
            // But consumers might need to know the doc ID if they want to update it?
            // Usually we just use collection/docId.
            // Let's ensure 'tmdbId' field remains the cleaner numeric one for API calls.
            // We can rely on 'mediaType' to reconstruct the doc ID if needed.
            title: fullMovie.title || fullMovie.name || 'Unknown Title', // Handle TV 'name'
            year,
            posterPath: fullMovie.poster_path,
            backdropPath: fullMovie.backdrop_path,
            overview: fullMovie.overview,
            tagline: fullMovie.tagline,
            runtime: fullMovie.runtime || (fullMovie.episode_run_time ? fullMovie.episode_run_time[0] : 0),
            genres: fullMovie.genres?.map(g => g.name),
            director,
            cast,
            createdBy: existingData?.createdBy || userId,
            createdAt: existingData?.createdAt || serverTimestamp(),
            // TV Specifics
            mediaType: tmdbMovie.media_type === 'tv' ? 'tv' : 'movie',
            numberOfSeasons: fullMovie.number_of_seasons,
            numberOfEpisodes: fullMovie.number_of_episodes,
            firstAirDate: fullMovie.first_air_date
        };

        // Sanitize object to remove undefined values which Firestore rejects
        const sanitizedMovie = removeUndefined(newMovie);

        await setDoc(docRef, sanitizedMovie, { merge: true });
        return newMovie;
    },

    async getMovie(tmdbId: string): Promise<Movie | null> {
        const docRef = doc(db, 'movies', tmdbId);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as Movie) : null;
    },

    async listRecent(limitCount = 50): Promise<Movie[]> {
        const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as Movie);
    }
};

