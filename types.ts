

export const ItemType = {
    TV_SERIES: 'TV Series',
    MOVIES: 'Movies',
};

export const SubType = {
    ANIME: 'Anime',
    BOLLYWOOD: 'Bollywood',
    HOLLYWOOD: 'Hollywood',
    KOREAN: 'Korean',
    JAPANESE: 'Japanese',
    TURKISH: 'Turkish',
    TOLLYWOOD: 'Tollywood',
    KOLLYWOOD: 'Kollywood',
    SANDALWOOD: 'Sandalwood',
    CHINESE: 'Chinese',
};

export const Status = {
    WATCH: 'Watch',
    WAITING: 'Waiting',
    COMPLETED: 'Completed',
    STOPPED: 'Stopped',
};

export const Language = {
    SUB: 'SUB',
    DUB: 'DUB',
};

export const ReleaseType = {
    NEW: 'New',
    OLD: 'Old',
};

// --- FIX: Add ChatMessage, MediaDetails, and NewWatchlistItem types ---
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    mediaDetails?: MediaDetails;
    mediaSuggestions?: MediaDetails[];
    promptSuggestions?: string[];
}

export interface MediaDetails {
    name: string;
    type: string;
    sub_type: string;
    season_sequel: string;
    count: number;
    episodes: string;
    part: string;
    genre: string;
    cast: string[];
    release_date: string;
    end_date: string;
    upcoming_date: string;
    language: string;
    platform: string;
    continuity: string;
    // for recommendations
    description?: string;
    dub?: string;
    item_type?: string;
}

export interface NewWatchlistItem {
    title: string;
    type: keyof typeof ItemType;
    sub_type?: keyof typeof SubType;
    status: keyof typeof Status;
    season?: number;
    part?: number;
    episode?: number;
    language: keyof typeof Language;
    release_type: keyof typeof ReleaseType;
    favorite?: boolean;
}
