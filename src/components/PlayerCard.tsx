import React, { useEffect, useState } from "react";
import { PlayerStats } from "../types/ApiTypes";
import { FaTrophy, FaSkull, FaBolt, FaChartLine, FaFire, FaStar } from 'react-icons/fa';
import { getPlayerFromCache, cachePlayer } from '../utils/cache';

interface PlayerCardProps {
  stats: PlayerStats;
  rank?: number;  // Make optional to maintain compatibility
}

interface MinecraftProfile {
  name: string;
  id: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ stats, rank }) => {
  const [profile, setProfile] = useState<MinecraftProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const kdr = (stats.kills / Math.max(stats.deaths, 1)).toFixed(2);

  useEffect(() => {
    setProfileLoading(true);
    
    // Check cache first
    const cached = getPlayerFromCache(stats.playerId);
    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }

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
      })
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [stats.playerId]);

  return (
    <div className="player-card">
      <div className="player-card-header">
        {profileLoading ? (
          <div className="profile-loading">Loading...</div>
        ) : profile ? (
          <>
            {rank && <div className="rank-number">#{rank}</div>}
            <img
              className="player-head"
              src={`https://crafatar.com/avatars/${stats.playerId}?overlay=true`}
              alt={profile.name}
              loading="lazy"
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
        <div><FaStar className="stat-icon" /> XP: {stats.xp}</div>
        <div><FaBolt className="stat-icon" /> Kills: {stats.kills}</div>
        <div><FaSkull className="stat-icon" /> Deaths: {stats.deaths}</div>
        <div><FaChartLine className="stat-icon" /> K/D: {kdr}</div>
        <div><FaTrophy className="stat-icon" /> Highest Streak: {stats.highestKillStreak}</div>
        <div><FaFire className="stat-icon" /> Current Streak: {stats.currentKillStreak}</div>
      </div>
    </div>
  );
};
