const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

export interface TMDBMovie {
    id: number;
    title?: string; // Movies have title
    name?: string; // TV shows have name
    media_type?: 'movie' | 'tv';
    release_date?: string;
    first_air_date?: string; // TV
    poster_path: string | null;
    backdrop_path?: string | null;
    overview: string;
    tagline?: string;
    runtime?: number;
    episode_run_time?: number[]; // TV specific
    number_of_seasons?: number;
    number_of_episodes?: number;
    seasons?: TMDBSeason[];
    genres?: { id: number; name: string }[];
    credits?: {
        cast: { name: string; character: string; profile_path: string | null }[];
        crew: { name: string; job: string }[];
    };
}

export interface TMDBSeason {
    air_date: string;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
    episodes?: TMDBEpisode[];
}

export interface TMDBEpisode {
    air_date: string;
    episode_number: number;
    id: number;
    name: string;
    overview: string;
    runtime: number;
    season_number: number;
    still_path: string | null;
    vote_average: number;
}

// Simple in-memory cache for search results to avoid hitting API too often
const searchCache: Record<string, TMDBMovie[]> = {};

export async function searchMovies(query: string, page: number = 1): Promise<TMDBMovie[]> {
    if (!query.trim()) return [];

    const cacheKey = `multi_${query.toLowerCase()}_${page}`;
    if (searchCache[cacheKey]) {
        return searchCache[cacheKey];
    }

    if (!TMDB_API_KEY) {
        console.error("TMDB Key missing");
        return [];
    }

    try {
        // Use search/multi to find both movies and tv shows
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`);
        const data = await res.json();

        // Filter out people, only keep movie and tv
        const results = (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');

        searchCache[cacheKey] = results;
        return results;
    } catch (error) {
        console.error("Error searching TMDB", error);
        return [];
    }
}

// Helper to get either movie or TV details based on ID
// Note: This tries movie first, if fails tries TV? Or we should pass type.
// Better to export specific functions or pass type if known.
// For legacy compat, we might need to know. But usually we know from the search result.

export async function getMovieById(id: string): Promise<TMDBMovie | null> {
    if (!TMDB_API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
        if (res.ok) {
            const data = await res.json();
            return { ...data, media_type: 'movie' };
        }
    } catch (e) { /* ignore */ }
    return null;
}

export async function getTVShowById(id: string): Promise<TMDBMovie | null> {
    if (!TMDB_API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
        if (res.ok) {
            const data = await res.json();
            return { ...data, media_type: 'tv', title: data.name, release_date: data.first_air_date };
        }
    } catch (error) {
        console.error("Error fetching TMDB TV", error);
    }
    return null;
}

export async function getSeasonDetails(tvId: string, seasonNumber: number): Promise<TMDBSeason | null> {
    if (!TMDB_API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error("Error fetching Season details", error);
        return null;
    }
}

export function getPosterUrl(path: string | null) {
    return path ? `${IMAGE_BASE_URL}${path}` : 'https://placehold.co/500x750/1a1a1a/666666?text=No+Poster';
}

export function getBackdropUrl(path: string | null) {
    return path ? `${BACKDROP_BASE_URL}${path}` : null;
}
