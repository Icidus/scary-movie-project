export interface UserProfile {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    email: string | null;
    colorKey?: UserColorKey | null;
    role?: 'member' | 'admin';
    createdAt?: any;
}

export type UserColorKey = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'destructive';

export interface Movie {
    tmdbId: string;
    title: string;
    year: number;
    posterPath: string | null;
    backdropPath?: string | null;
    overview?: string;
    tagline?: string;
    runtime?: number;
    genres?: string[];
    director?: string;
    cast?: { name: string; role: string; profilePath?: string | null }[];
    createdBy: string;
    createdAt?: any;
    tags?: string[];
    // derived fields for UI
    overallAverage?: number;
    enjoymentAverage?: number;
    // TV Specific
    mediaType?: 'movie' | 'tv';
    numberOfSeasons?: number;
    numberOfEpisodes?: number;
    firstAirDate?: string;
}

export interface Season {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
    episode_count: number;
    air_date: string;
    episodes?: Episode[];
}

export interface Episode {
    id: number;
    name: string;
    overview: string;
    still_path: string | null;
    vote_average: number;
    episode_number: number;
    season_number: number;
    air_date: string;
    runtime?: number;
}

export interface Ratings {
    overall: number;
    enjoyment: number;
    jump: number;
    dread: number;
    gore: number;
    atmosphere: number;
    story: number;
    rewatch: number;
    wtf: number;
    cozy: number;
}

export interface Viewing {
    id?: string;
    movieId: string; // The ID of the parent Movie or TV Show
    mediaType?: 'movie' | 'tv' | 'episode';
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
    userId: string;
    watchedAt: string; // YYYY-MM-DD
    ratings: Ratings;
    toggles: {
        wouldWatchAgain: boolean;
        wouldRecommend: boolean;
    };
    notes?: string;
    insertedAt?: any;
}
