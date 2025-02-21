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

export type SortOption = 'kills' | 'xp' | 'deaths' | 'currentKillStreak' | 'highestKillStreak' | 'bounty';
