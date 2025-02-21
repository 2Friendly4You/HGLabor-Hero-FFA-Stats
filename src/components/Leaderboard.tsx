import React, { useEffect, useState } from 'react';
import { PlayerStats } from '../types/ApiTypes';
import { PlayerCard } from './PlayerCard';
import { PlayerSearch } from './PlayerSearch';

export const Leaderboard: React.FC = () => {
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [sort, setSort] = useState<'kills' | 'xp'>('kills');
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'search'>('leaderboard');

    useEffect(() => {
        fetch(`https://api.hglabor.de/stats/ffa/top?sort=${sort}`)
            .then(res => res.json())
            .then(data => setPlayers(data));
    }, [sort]);

    return (
        <div className="leaderboard">
            <h1>Hero FFA Stats</h1>
            <div className="tabs">
                <button 
                    className={activeTab === 'leaderboard' ? 'active' : ''} 
                    onClick={() => setActiveTab('leaderboard')}
                >
                    Leaderboard
                </button>
                <button 
                    className={activeTab === 'search' ? 'active' : ''} 
                    onClick={() => setActiveTab('search')}
                >
                    Player Search
                </button>
            </div>
            {activeTab === 'leaderboard' ? (
                <div className="leaderboard-content">
                    <select value={sort} onChange={(e) => setSort(e.target.value as 'kills' | 'xp')}>
                        <option value="kills">Sort by Kills</option>
                        <option value="xp">Sort by XP</option>
                    </select>
                    <div className="players-grid">
                        {players.map(player => (
                            <PlayerCard key={player.playerId} stats={player} />
                        ))}
                    </div>
                </div>
            ) : (
                <PlayerSearch />
            )}
        </div>
    );
};