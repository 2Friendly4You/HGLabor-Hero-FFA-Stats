import { PlayerStats, SortOption } from '../types/ApiTypes';

interface DatabaseCache {
    players: {
        data: PlayerStats[];
        lastUpdated: number;
        isFullyLoaded: boolean;
    };
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const DB_CACHE_KEY = 'hglabor_ffa_db';
const ITEMS_PER_PAGE = 100;
const BACKGROUND_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

class Database {
    private cache: DatabaseCache;
    private loadingPromise: Promise<void> | null = null;
    private isLoadingMore: boolean = false;
    private backgroundRefreshTimeout: number | null = null;

    constructor() {
        this.cache = this.loadCache();
        
        // Initial load
        if (!this.cache.players?.data || this.isDataStale(this.cache.players.lastUpdated)) {
            this.loadInitialPlayers();
        } else if (!this.cache.players.isFullyLoaded) {
            // Resume loading in background if previous load was incomplete
            this.loadRemainingPlayersInBackground();
        }

        // Set up background refresh
        this.setupBackgroundRefresh();
    }

    private loadCache(): DatabaseCache {
        try {
            const cached = localStorage.getItem(DB_CACHE_KEY);
            return cached ? JSON.parse(cached) : {
                players: { data: [], lastUpdated: 0, isFullyLoaded: false }
            };
        } catch {
            return {
                players: { data: [], lastUpdated: 0, isFullyLoaded: false }
            };
        }
    }

    private saveCache(): void {
        localStorage.setItem(DB_CACHE_KEY, JSON.stringify(this.cache));
    }

    private isDataStale(timestamp: number): boolean {
        return Date.now() - timestamp > CACHE_DURATION;
    }

    private setupBackgroundRefresh(): void {
        if (this.backgroundRefreshTimeout) {
            clearInterval(this.backgroundRefreshTimeout);
        }

        this.backgroundRefreshTimeout = window.setInterval(() => {
            this.refreshDataInBackground();
        }, BACKGROUND_REFRESH_INTERVAL);
    }

    private async refreshDataInBackground(): Promise<void> {
        try {
            const oldData = [...this.cache.players.data];
            await this.loadAllPlayers();
            
            // Notify any listeners that data has been updated
            window.dispatchEvent(new CustomEvent('database-updated', {
                detail: { oldData, newData: this.cache.players.data }
            }));
        } catch (error) {
            console.error('Background refresh failed:', error);
        }
    }

    private async loadInitialPlayers(): Promise<void> {
        try {
            const response = await fetch('https://api.hglabor.de/stats/ffa/top?sort=kills&page=1');
            if (!response.ok) throw new Error('Failed to load initial players');
            
            const players: PlayerStats[] = await response.json();
            
            this.cache.players = {
                data: this.deduplicatePlayers(players),
                lastUpdated: Date.now(),
                isFullyLoaded: false
            };
            
            this.saveCache();
            
            // Start loading remaining players in background
            this.loadRemainingPlayersInBackground();
        } catch (error) {
            console.error('Failed to load initial players:', error);
            throw error;
        }
    }

    private async loadRemainingPlayersInBackground(): Promise<void> {
        if (this.isLoadingMore) return;
        
        console.debug('Starting background load...');
        this.isLoadingMore = true;
        let page = 2; // Start from page 2 since page 1 is already loaded
        
        try {
            while (true) {
                console.debug('Loading page:', page);
                const response = await fetch(`https://api.hglabor.de/stats/ffa/top?sort=kills&page=${page}`);
                if (!response.ok) break;
                
                const players: PlayerStats[] = await response.json();
                if (players.length === 0) break;

                // Update cache with new players
                this.cache.players.data = this.deduplicatePlayers([
                    ...this.cache.players.data,
                    ...players
                ]);
                
                this.saveCache();
                console.debug('Updated cache with page:', page);

                // Dispatch update event after each page is loaded
                window.dispatchEvent(new CustomEvent('database-pagination-update'));
                
                page++;

                // Small delay to not overwhelm the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.debug('Background loading complete');
            this.cache.players.isFullyLoaded = true;
            this.saveCache();
            
            // Dispatch an event to notify that loading is complete
            window.dispatchEvent(new CustomEvent('database-load-complete'));
            window.dispatchEvent(new CustomEvent('database-pagination-update'));
        } catch (error) {
            console.error('Failed to load remaining players:', error);
        } finally {
            this.isLoadingMore = false;
        }
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
                lastUpdated: Date.now(),
                isFullyLoaded: true
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
        // If we don't have any data yet, load initial data
        if (this.cache.players.data.length === 0) {
            await this.loadInitialPlayers();
        }
        
        // If data is stale, trigger a background refresh but still return current data
        if (this.isDataStale(this.cache.players.lastUpdated)) {
            this.refreshDataInBackground();
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
        // Ensure we have proper pagination calculation even during background loading
        const sortedPlayers = this.getSortedPlayers(sort);
        const nextPageStart = currentPage * ITEMS_PER_PAGE;
        const hasMore = sortedPlayers.length > nextPageStart;
        
        // If we're still loading and there are players on the current page,
        // assume there might be a next page
        if (!this.isFullyLoaded() && sortedPlayers.length >= currentPage * ITEMS_PER_PAGE) {
            return true;
        }
        
        return hasMore;
    }

    clearCache(): void {
        this.cache = {
            players: { data: [], lastUpdated: 0, isFullyLoaded: false }
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

    isFullyLoaded(): boolean {
        const isLoaded = this.cache.players.isFullyLoaded;
        console.debug('Database fully loaded:', isLoaded);
        return isLoaded;
    }

    isInitialLoadComplete(): boolean {
        const isComplete = this.cache.players.data.length > 0;
        console.debug('Initial load complete:', isComplete);
        return isComplete;
    }
}

export const db = new Database();