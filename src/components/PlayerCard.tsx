import React from 'react';
import { PlayerStats } from '../types/ApiTypes';

interface PlayerCardProps {
    stats: PlayerStats;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ stats }) => {
    const kdr = (stats.kills / Math.max(stats.deaths, 1)).toFixed(2);

    return (
        <div className="player-card">
            <h2>{stats.playerId}</h2>
            <div className="stats-grid">
                <div>XP: {stats.xp}</div>
                <div>Kills: {stats.kills}</div>
                <div>Deaths: {stats.deaths}</div>
                <div>K/D: {kdr}</div>
                <div>Highest Streak: {stats.highestKillStreak}</div>
                <div>Current Streak: {stats.currentKillStreak}</div>
            </div>
        </div>
    );
}
