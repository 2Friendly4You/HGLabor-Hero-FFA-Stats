import React, { useEffect, useState } from "react";
import { PlayerStats } from "../types/ApiTypes";
import { FaTrophy, FaSkull, FaBolt, FaChartLine, FaFire, FaStar } from 'react-icons/fa';
import { getPlayerFromCache, cachePlayer } from '../utils/cache';

interface PlayerCardProps {
    stats: PlayerStats;
    rank?: number;
}

interface MinecraftProfile {
    name: string;
    id: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ stats, rank }) => {
    const [profile, setProfile] = useState<MinecraftProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculate K/D with safety checks
    const kills = Math.max(0, stats?.kills || 0);
    const deaths = Math.max(1, stats?.deaths || 1);
    const kdr = (kills / deaths).toFixed(2);

    useEffect(() => {
        if (!stats?.playerId) {
            setError('Invalid player data');
            setProfileLoading(false);
            return;
        }

        setProfileLoading(true);
        setError(null);
        
        // Check cache first
        const cached = getPlayerFromCache(stats.playerId);
        if (cached) {
            setProfile(cached);
            setProfileLoading(false);
            return;
        }

        // Fetch profile if not cached
        fetch(`https://api.ashcon.app/mojang/v2/user/${stats.playerId}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch profile');
                return res.json();
            })
            .then(data => {
                const profileData = {
                    name: data.username,
                    id: data.uuid
                };
                cachePlayer(stats.playerId, profileData);
                setProfile(profileData);
                setError(null);
            })
            .catch(() => {
                setProfile(null);
                setError('Could not load player profile');
            })
            .finally(() => setProfileLoading(false));
    }, [stats?.playerId]);

    if (!stats) {
        return <div className="player-card error">Invalid player data</div>;
    }

    return (
        <div className="player-card">
            <div className="player-card-header">
                {profileLoading ? (
                    <div className="profile-loading">Loading...</div>
                ) : error ? (
                    <div className="player-identity">
                        <h2>Unknown Player</h2>
                        <div className="player-uuid">{stats.playerId}</div>
                    </div>
                ) : profile ? (
                    <>
                        {rank !== undefined && <div className="rank-number">#{rank}</div>}
                        <img
                            className="player-head"
                            src={`https://crafatar.com/avatars/${stats.playerId}?overlay=true`}
                            alt={profile.name}
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.src = 'default-skin.png';
                                e.currentTarget.onerror = null;
                            }}
                        />
                        <div className="player-identity">
                            <h2>{profile.name}</h2>
                            <div className="player-uuid">{stats.playerId}</div>
                        </div>
                    </>
                ) : (
                    <div className="player-identity">
                        <h2>Unknown Player</h2>
                        <div className="player-uuid">{stats.playerId}</div>
                    </div>
                )}
            </div>
            <div className="stats-grid">
                <div><FaStar className="stat-icon" /> XP: {Math.max(0, stats.xp || 0)}</div>
                <div><FaBolt className="stat-icon" /> Kills: {Math.max(0, stats.kills || 0)}</div>
                <div><FaSkull className="stat-icon" /> Deaths: {Math.max(0, stats.deaths || 0)}</div>
                <div><FaChartLine className="stat-icon" /> K/D: {kdr}</div>
                <div><FaTrophy className="stat-icon" /> Highest Streak: {Math.max(0, stats.highestKillStreak || 0)}</div>
                <div><FaFire className="stat-icon" /> Current Streak: {Math.max(0, stats.currentKillStreak || 0)}</div>
            </div>
        </div>
    );
};
