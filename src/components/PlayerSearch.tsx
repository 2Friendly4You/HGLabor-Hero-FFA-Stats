import React, { useState, useEffect, useCallback } from 'react';
import { PlayerCard } from './PlayerCard';
import { PlayerStats } from '../types/ApiTypes';
import { LoadingSpinner } from './LoadingSpinner';
import { db } from '../utils/database';
import { getPlayerFromCache } from '../utils/cache';

interface PlayerSearchProps {
    onPlayerSelect?: (playerId: string) => void;
}

interface PlayerMatch {
    player: PlayerStats;
    matchScore: number;
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [matchingPlayers, setMatchingPlayers] = useState<PlayerMatch[]>([]);
    const [loading, setLoading] = useState(false);

    const calculateMatchScore = (input: string, target: string): number => {
        input = input.toLowerCase();
        target = target.toLowerCase();
        
        // Exact match gets highest score
        if (target === input) return 100;
        
        // Starts with gets high score
        if (target.startsWith(input)) return 90;
        
        // Contains gets medium score
        if (target.includes(input)) return 80;
        
        // Levenshtein distance for fuzzy matching
        const distance = levenshteinDistance(input, target);
        const maxLength = Math.max(input.length, target.length);
        const similarity = 1 - (distance / maxLength);
        
        return similarity * 70; // Scale to be lower than contains/starts with
    };

    const levenshteinDistance = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[a.length][b.length];
    };

    const updateMatches = useCallback(async () => {
        if (!searchTerm || searchTerm.length < 2) {
            setMatchingPlayers([]);
            return;
        }

        setLoading(true);
        try {
            const matches: PlayerMatch[] = [];
            const players = await db.getLeaderboard('kills', 1); // Get first page of players
            
            for (const player of players) {
                const cached = getPlayerFromCache(player.playerId);
                if (cached) {
                    const nameScore = calculateMatchScore(searchTerm, cached.name);
                    const idScore = calculateMatchScore(searchTerm, player.playerId);
                    const maxScore = Math.max(nameScore, idScore);
                    
                    if (maxScore > 50) { // Only include if it's a decent match
                        matches.push({
                            player,
                            matchScore: maxScore
                        });
                    }
                }
            }

            // Sort by match score (highest first)
            matches.sort((a, b) => b.matchScore - a.matchScore);
            setMatchingPlayers(matches.slice(0, 3)); // Show top 3 matches
        } catch (err) {
            console.error('Error updating matches:', err);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            updateMatches();
        }, 300); // Debounce matches update

        return () => clearTimeout(timer);
    }, [searchTerm, updateMatches]);

    const handlePlayerClick = (playerId: string) => {
        onPlayerSelect?.(playerId);
    };

    return (
        <div className="player-search">
            <div className="search-container">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            updateMatches();
                        }
                    }}
                    placeholder="Enter player name"
                    className="search-input"
                />
            </div>
            {loading && <LoadingSpinner />}
            <div className="matching-players">
                {matchingPlayers.map(({ player }) => (
                    <div 
                        key={player.playerId}
                        className="player-match"
                        onClick={() => handlePlayerClick(player.playerId)}
                    >
                        <PlayerCard stats={player} />
                    </div>
                ))}
                {searchTerm.length >= 2 && !loading && matchingPlayers.length === 0 && (
                    <div className="no-matches">No matching players found</div>
                )}
            </div>
        </div>
    );
};
