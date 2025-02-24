import { PlayerStats, SortOption } from '../types/ApiTypes';

interface DatabaseCache {
    players: {
        data: PlayerStats[];
        lastUpdated: number;
    };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const DB_CACHE_KEY = 'hglabor_ffa_db';
const ITEMS_PER_PAGE = 100;

class Database {
    private cache: DatabaseCache;
    private loadingPromise: Promise<void> | null = null;

    constructor() {
        this.cache = this.loadCache();
        if (!this.cache.players?.data || this.isDataStale(this.cache.players.lastUpdated)) {
            this.loadingPromise = this.loadAllPlayers();
        }
    }

    private loadCache(): DatabaseCache {
        try {
            const cached = localStorage.getItem(DB_CACHE_KEY);
            return cached ? JSON.parse(cached) : {
                players: { data: [], lastUpdated: 0 }
            };
        } catch {
            return {
                players: { data: [], lastUpdated: 0 }
            };
        }
    }

    private saveCache(): void {
        localStorage.setItem(DB_CACHE_KEY, JSON.stringify(this.cache));
    }

    private isDataStale(timestamp: number): boolean {
        return Date.now() - timestamp > CACHE_DURATION;
    }

    private deduplicatePlayers(players: PlayerStats[]): PlayerStats[] {
        const uniquePlayers = new Map<string, PlayerStats>();
        
        for (const player of players) {
            const existing = uniquePlayers.get(player.playerId);
            if (!existing || this.isPlayerDataNewer(player, existing)) {
                uniquePlayers.set(player.playerId, this.sanitizePlayerData(player));
            }
        }
        
        return Array.from(uniquePlayers.values());
    }

    private isPlayerDataNewer(newData: PlayerStats, oldData: PlayerStats): boolean {
        // Compare relevant stats to determine if the new data is more recent
        return newData.kills >= oldData.kills && 
               newData.deaths >= oldData.deaths && 
               newData.xp >= oldData.xp;
    }

    private sanitizePlayerData(player: PlayerStats): PlayerStats {
        return {
            ...player,
            kills: Math.max(0, player.kills || 0),
            deaths: Math.max(0, player.deaths || 0),
            xp: Math.max(0, player.xp || 0),
            currentKillStreak: Math.max(0, player.currentKillStreak || 0),
            highestKillStreak: Math.max(0, player.highestKillStreak || 0),
            bounty: Math.max(0, player.bounty || 0),
            heroes: player.heroes || { aang: {}, katara: {}, toph: {} },
            playerId: player.playerId.trim() // Ensure no whitespace in IDs
        };
    }

    private async loadAllPlayers(): Promise<void> {
        try {
            const allPlayers: PlayerStats[] = [];
            let page = 1;
            const seenPlayerIds = new Set<string>();
            
            while (true) {
                const response = await fetch(`https://api.hglabor.de/stats/ffa/top?sort=kills&page=${page}`);
                if (!response.ok) break;
                
                const players: PlayerStats[] = await response.json();
                if (players.length === 0) break;

                // Only add players we haven't seen before
                for (const player of players) {
                    if (!seenPlayerIds.has(player.playerId)) {
                        seenPlayerIds.add(player.playerId);
                        allPlayers.push(player);
                    }
                }

                page++;

                // Small delay to not overwhelm the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Deduplicate and sanitize all players before saving
            this.cache.players = {
                data: this.deduplicatePlayers(allPlayers),
                lastUpdated: Date.now()
            };
            
            this.saveCache();
            this.loadingPromise = null;
        } catch (error) {
            console.error('Failed to load players:', error);
            this.loadingPromise = null;
            throw error;
        }
    }

    private calculateKDValue(player: PlayerStats): number {
        const kills = Math.max(0, player.kills || 0);
        const deaths = Math.max(1, player.deaths || 1);
        return kills / deaths;
    }

    private getSortedPlayers(sort: SortOption): PlayerStats[] {
        const validPlayers = this.cache.players.data
            .map(p => this.sanitizePlayerData(p))
            .filter(p => p.playerId && typeof p.playerId === 'string');

        if (sort === 'kd') {
            return validPlayers.sort((a, b) => {
                const kdA = this.calculateKDValue(a);
                const kdB = this.calculateKDValue(b);
                if (kdA === kdB) {
                    // If K/D is equal, sort by kills
                    return b.kills - a.kills;
                }
                return kdB - kdA;
            });
        }

        return validPlayers.sort((a, b) => {
            const valA = a[sort] || 0;
            const valB = b[sort] || 0;
            if (valA === valB) {
                // Secondary sort by K/D ratio when primary sort values are equal
                return this.calculateKDValue(b) - this.calculateKDValue(a);
            }
            return valB - valA;
        });
    }

    async getLeaderboard(sort: SortOption, page: number): Promise<PlayerStats[]> {
        if (this.loadingPromise) {
            await this.loadingPromise;
        }

        if (!this.cache.players?.data || this.isDataStale(this.cache.players.lastUpdated)) {
            await this.loadAllPlayers();
        }

        const sortedPlayers = this.getSortedPlayers(sort);
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;

        return sortedPlayers.slice(start, end);
    }

    async getPlayer(uuid: string): Promise<PlayerStats> {
        if (this.loadingPromise) {
            await this.loadingPromise;
        }

        const cleanUuid = uuid.trim();

        // Check cache first
        const player = this.cache.players.data.find(p => p.playerId === cleanUuid);
        if (player && !this.isDataStale(this.cache.players.lastUpdated)) {
            return this.sanitizePlayerData(player);
        }

        // If not in cache or stale, fetch directly
        const response = await fetch(`https://api.hglabor.de/stats/ffa/${cleanUuid}`);
        if (!response.ok) throw new Error('Player not found');
        
        const playerData: PlayerStats = await response.json();
        return this.sanitizePlayerData(playerData);
    }

    hasNextPage(sort: SortOption, currentPage: number): boolean {
        const totalPlayers = this.getSortedPlayers(sort).length;
        return totalPlayers > currentPage * ITEMS_PER_PAGE;
    }

    clearCache(): void {
        this.cache = {
            players: { data: [], lastUpdated: 0 }
        };
        this.saveCache();
        this.loadingPromise = this.loadAllPlayers();
    }

    private getPlayerRankForField(playerId: string, field: SortOption): number {
        const validPlayers = this.cache.players.data
            .map(p => this.sanitizePlayerData(p))
            .filter(p => p.playerId && typeof p.playerId === 'string');

        if (field === 'kd') {
            const sortedPlayers = validPlayers.sort((a, b) => {
                const kdA = this.calculateKDValue(a);
                const kdB = this.calculateKDValue(b);
                if (kdA === kdB) {
                    return b.kills - a.kills;
                }
                return kdB - kdA;
            });
            return sortedPlayers.findIndex(p => p.playerId === playerId) + 1;
        }

        const sortedPlayers = validPlayers.sort((a, b) => {
            const valA = a[field] || 0;
            const valB = b[field] || 0;
            if (valA === valB) {
                return this.calculateKDValue(b) - this.calculateKDValue(a);
            }
            return valB - valA;
        });
        return sortedPlayers.findIndex(p => p.playerId === playerId) + 1;
    }

    async getPlayerRanks(playerId: string): Promise<Record<SortOption, number>> {
        if (this.loadingPromise) {
            await this.loadingPromise;
        }

        if (!this.cache.players?.data || this.isDataStale(this.cache.players.lastUpdated)) {
            await this.loadAllPlayers();
        }

        const ranks: Record<SortOption, number> = {
            kills: this.getPlayerRankForField(playerId, 'kills'),
            deaths: this.getPlayerRankForField(playerId, 'deaths'),
            xp: this.getPlayerRankForField(playerId, 'xp'),
            currentKillStreak: this.getPlayerRankForField(playerId, 'currentKillStreak'),
            highestKillStreak: this.getPlayerRankForField(playerId, 'highestKillStreak'),
            bounty: this.getPlayerRankForField(playerId, 'bounty'),
            kd: this.getPlayerRankForField(playerId, 'kd')
        };

        return ranks;
    }
}

export const db = new Database();