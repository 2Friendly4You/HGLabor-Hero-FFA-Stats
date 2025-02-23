import { PlayerStats, SortOption } from '../types/ApiTypes';

interface LeaderboardEntry {
    playerId: string;
    sortValue: number;
}

interface DatabaseCache {
    leaderboard: {
        [key in SortOption]?: {
            pages: { [page: number]: LeaderboardEntry[] };
            lastUpdated: number;
        };
    };
    players: {
        [uuid: string]: {
            data: PlayerStats;
            lastUpdated: number;
        };
    };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DB_CACHE_KEY = 'hglabor_ffa_db';

class Database {
    private cache: DatabaseCache;

    constructor() {
        this.cache = this.loadCache();
    }

    private loadCache(): DatabaseCache {
        try {
            const cached = localStorage.getItem(DB_CACHE_KEY);
            return cached ? JSON.parse(cached) : { leaderboard: {}, players: {} };
        } catch {
            return { leaderboard: {}, players: {} };
        }
    }

    private saveCache(): void {
        localStorage.setItem(DB_CACHE_KEY, JSON.stringify(this.cache));
    }

    private isDataStale(timestamp: number): boolean {
        return Date.now() - timestamp > CACHE_DURATION;
    }

    async getLeaderboard(sort: SortOption, page: number): Promise<PlayerStats[]> {
        // Check cache first
        const cachedLeaderboard = this.cache.leaderboard[sort];
        const cachedPage = cachedLeaderboard?.pages[page];
        
        if (cachedPage && !this.isDataStale(cachedLeaderboard.lastUpdated)) {
            // Return cached data with full player details
            return Promise.all(
                cachedPage.map(entry => this.getPlayer(entry.playerId))
            );
        }

        // Fetch fresh data
        const response = await fetch(`https://api.hglabor.de/stats/ffa/top?sort=${sort}&page=${page}`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        
        const players: PlayerStats[] = await response.json();

        // Cache the leaderboard entries
        if (!this.cache.leaderboard[sort]) {
            this.cache.leaderboard[sort] = { pages: {}, lastUpdated: Date.now() };
        }
        
        this.cache.leaderboard[sort]!.pages[page] = players.map(player => ({
            playerId: player.playerId,
            sortValue: player[sort] as number
        }));
        this.cache.leaderboard[sort]!.lastUpdated = Date.now();

        // Cache individual player data
        players.forEach(player => {
            this.cache.players[player.playerId] = {
                data: player,
                lastUpdated: Date.now()
            };
        });

        this.saveCache();
        return players;
    }

    async getPlayer(uuid: string): Promise<PlayerStats> {
        const cachedPlayer = this.cache.players[uuid];
        if (cachedPlayer && !this.isDataStale(cachedPlayer.lastUpdated)) {
            return cachedPlayer.data;
        }

        const response = await fetch(`https://api.hglabor.de/stats/ffa/${uuid}`);
        if (!response.ok) throw new Error('Player not found');
        
        const playerData: PlayerStats = await response.json();
        
        this.cache.players[uuid] = {
            data: playerData,
            lastUpdated: Date.now()
        };
        
        this.saveCache();
        return playerData;
    }

    clearCache(): void {
        this.cache = { leaderboard: {}, players: {} };
        this.saveCache();
    }
}

export const db = new Database();