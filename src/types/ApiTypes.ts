export interface PlayerStats {
    playerId: string;
    xp: number;
    kills: number;
    deaths: number;
    currentKillStreak: number;
    highestKillStreak: number;
    bounty: number;
    heroes: HeroStats;
}

export interface HeroStats {
    aang: HeroAbilities;
    katara: HeroAbilities;
    toph: HeroAbilities;
}

export interface HeroAbilities {
    [key: string]: {
        [key: string]: {
            experiencePoints: number;
        };
    };
}

export type SortOption = 'kills' | 'xp' | 'deaths' | 'currentKillStreak' | 'highestKillStreak' | 'bounty' | 'kd';

interface DatabaseEventMap {
    'database-updated': CustomEvent<{ oldData: PlayerStats[]; newData: PlayerStats[] }>;
    'database-load-complete': CustomEvent<void>;
    'database-pagination-update': CustomEvent<void>;
}

declare global {
    interface WindowEventMap extends DatabaseEventMap {}
}

export type { DatabaseEventMap };
