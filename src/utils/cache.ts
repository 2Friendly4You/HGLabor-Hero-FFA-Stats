interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface PlayerCacheData {
    name: string;
    id: string;
}

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'minecraft_profile_cache';

export const getPlayerFromCache = (uuid: string): PlayerCacheData | null => {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const entry = cache[uuid] as CacheEntry<PlayerCacheData> | undefined;
        
        if (!entry) return null;
        if (Date.now() - entry.timestamp > MONTH_IN_MS) {
            delete cache[uuid];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            return null;
        }
        
        return entry.data;
    } catch {
        return null;
    }
};

export const cachePlayer = (uuid: string, data: PlayerCacheData): void => {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        cache[uuid] = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore cache errors
    }
};

export const clearPlayerCache = (): void => {
    localStorage.removeItem(CACHE_KEY);
};
