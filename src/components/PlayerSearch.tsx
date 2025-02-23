import React, { useState } from 'react';
import { PlayerCard } from './PlayerCard';
import { PlayerStats } from '../types/ApiTypes';
import { LoadingSpinner } from './LoadingSpinner';
import { db } from '../utils/database';

export const PlayerSearch: React.FC = () => {
    const [playerId, setPlayerId] = useState('');
    const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        try {
            setLoading(true);
            setError('');

            let searchUUID = playerId;
            
            // If input doesn't look like a UUID, try to get UUID from username
            if (!playerId.includes('-') && playerId.length < 32) {
                try {
                    const profileRes = await fetch(`https://api.ashcon.app/mojang/v2/user/${playerId}`);
                    if (!profileRes.ok) throw new Error('Player not found');
                    const profileData = await profileRes.json();
                    searchUUID = profileData.uuid;
                } catch (err) {
                    setError('Player not found');
                    setLoading(false);
                    return;
                }
            }

            const data = await db.getPlayer(searchUUID);
            setPlayerData(data);
        } catch (err) {
            setError('Player not found');
            setPlayerData(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="player-search">
            <div className="search-container">
                <input
                    type="text"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="Enter player name or UUID"
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            {loading && <LoadingSpinner />}
            {error && <div className="error">{error}</div>}
            {playerData && <PlayerCard stats={playerData} />}
        </div>
    );
};
