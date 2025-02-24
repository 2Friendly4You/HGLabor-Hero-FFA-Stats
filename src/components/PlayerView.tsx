import React, { useEffect, useState } from "react";
import { PlayerStats } from "../types/ApiTypes";
import { FaTrophy, FaSkull, FaBolt, FaChartLine, FaFire, FaStar, FaArrowLeft } from 'react-icons/fa';
import { GiMagicPalm, GiWaterDrop, GiRock } from 'react-icons/gi';
import { getPlayerFromCache, cachePlayer } from '../utils/cache';
import { LoadingSpinner } from './LoadingSpinner';
import { db } from '../utils/database';

interface MinecraftProfile {
    name: string;
    id: string;
}

interface PlayerViewProps {
    playerId: string;
    onBack: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({ playerId, onBack }) => {
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [profile, setProfile] = useState<MinecraftProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPlayerData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load player stats
                const playerStats = await db.getPlayer(playerId);
                setStats(playerStats);

                // Load player profile
                const cached = getPlayerFromCache(playerId);
                if (cached) {
                    setProfile(cached);
                } else {
                    const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${playerId}`);
                    if (!res.ok) throw new Error('Failed to fetch profile');
                    const data = await res.json();
                    const profileData = {
                        name: data.username,
                        id: data.uuid
                    };
                    cachePlayer(playerId, profileData);
                    setProfile(profileData);
                }
            } catch (err) {
                setError('Could not load player data');
            } finally {
                setLoading(false);
            }
        };

        loadPlayerData();
    }, [playerId]);

    if (loading) {
        return <div className="player-view"><LoadingSpinner /></div>;
    }

    if (error || !stats) {
        return (
            <div className="player-view">
                <div className="error">{error || 'Failed to load player data'}</div>
                <button onClick={onBack} className="back-button">
                    <FaArrowLeft /> Back
                </button>
            </div>
        );
    }

    const kills = Math.max(0, stats.kills || 0);
    const deaths = Math.max(1, stats.deaths || 0);
    const kdr = (kills / deaths).toFixed(2);

    // Calculate total XP for each hero
    const calculateHeroXP = (abilities: Record<string, Record<string, { experiencePoints: number }>>) => {
        return Object.values(abilities).reduce((total, ability) => {
            return total + Object.values(ability).reduce((sum, { experiencePoints }) => sum + experiencePoints, 0);
        }, 0);
    };

    const aangXP = calculateHeroXP(stats.heroes.aang);
    const kataraXP = calculateHeroXP(stats.heroes.katara);
    const tophXP = calculateHeroXP(stats.heroes.toph);

    return (
        <div className="player-view">
            <button onClick={onBack} className="back-button">
                <FaArrowLeft /> Back
            </button>
            
            <div className="player-header">
                <img
                    className="player-head large"
                    src={`https://crafatar.com/avatars/${stats.playerId}?overlay=true&size=128`}
                    alt={profile?.name || 'Player'}
                    onError={(e) => {
                        e.currentTarget.src = 'default-skin.png';
                        e.currentTarget.onerror = null;
                    }}
                />
                <div className="player-info">
                    <h1>{profile?.name || 'Unknown Player'}</h1>
                    <div className="player-uuid">{stats.playerId}</div>
                </div>
            </div>

            <div className="stats-section">
                <h2>General Statistics</h2>
                <div className="stats-grid extended">
                    <div><FaStar className="stat-icon" /> Total XP: {Math.max(0, stats.xp || 0)}</div>
                    <div><FaBolt className="stat-icon" /> Kills: {kills}</div>
                    <div><FaSkull className="stat-icon" /> Deaths: {deaths}</div>
                    <div><FaChartLine className="stat-icon" /> K/D Ratio: {kdr}</div>
                    <div><FaTrophy className="stat-icon" /> Highest Streak: {Math.max(0, stats.highestKillStreak || 0)}</div>
                    <div><FaFire className="stat-icon" /> Current Streak: {Math.max(0, stats.currentKillStreak || 0)}</div>
                </div>
            </div>

            <div className="hero-stats-section">
                <h2>Hero Statistics</h2>
                <div className="hero-stats-grid">
                    <div className="hero-card">
                        <h3><GiMagicPalm /> Aang</h3>
                        <div className="hero-xp">Total XP: {aangXP}</div>
                        <div className="abilities-list">
                            {Object.entries(stats.heroes.aang).map(([ability, data]) => (
                                <div key={ability} className="ability-item">
                                    <span className="ability-name">{ability}</span>
                                    <span className="ability-xp">
                                        {Object.values(data).reduce((sum, { experiencePoints }) => sum + experiencePoints, 0)} XP
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="hero-card">
                        <h3><GiWaterDrop /> Katara</h3>
                        <div className="hero-xp">Total XP: {kataraXP}</div>
                        <div className="abilities-list">
                            {Object.entries(stats.heroes.katara).map(([ability, data]) => (
                                <div key={ability} className="ability-item">
                                    <span className="ability-name">{ability}</span>
                                    <span className="ability-xp">
                                        {Object.values(data).reduce((sum, { experiencePoints }) => sum + experiencePoints, 0)} XP
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="hero-card">
                        <h3><GiRock /> Toph</h3>
                        <div className="hero-xp">Total XP: {tophXP}</div>
                        <div className="abilities-list">
                            {Object.entries(stats.heroes.toph).map(([ability, data]) => (
                                <div key={ability} className="ability-item">
                                    <span className="ability-name">{ability}</span>
                                    <span className="ability-xp">
                                        {Object.values(data).reduce((sum, { experiencePoints }) => sum + experiencePoints, 0)} XP
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};