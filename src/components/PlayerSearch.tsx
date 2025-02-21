import React, { useState } from 'react';
import { PlayerCard } from './PlayerCard';
import { PlayerStats } from '../types/ApiTypes';

export const PlayerSearch: React.FC = () => {
    const [playerId, setPlayerId] = useState('');
    const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        try {
            const response = await fetch(`https://api.hglabor.de/stats/ffa/${playerId}`);
            if (!response.ok) {
                throw new Error('Player not found');
            }
            const data = await response.json();
            setPlayerData(data);
            setError('');
        } catch (err) {
            setError('Player not found');
            setPlayerData(null);
        }
    };

    return (
        <div className="player-search">
            <div className="search-container">
                <input
                    type="text"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="Enter player UUID"
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            {error && <div className="error">{error}</div>}
            {playerData && <PlayerCard stats={playerData} />}
        </div>
    );
};
