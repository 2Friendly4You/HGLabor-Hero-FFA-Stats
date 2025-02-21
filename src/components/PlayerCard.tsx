import React, { useEffect, useState } from "react";
import { PlayerStats } from "../types/ApiTypes";

interface PlayerCardProps {
  stats: PlayerStats;
}

interface MinecraftProfile {
  name: string;
  id: string;
}

// Add cache for player profiles
const profileCache = new Map<string, MinecraftProfile>();

export const PlayerCard: React.FC<PlayerCardProps> = ({ stats }) => {
  const [profile, setProfile] = useState<MinecraftProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const kdr = (stats.kills / Math.max(stats.deaths, 1)).toFixed(2);

  useEffect(() => {
    setProfileLoading(true);
    
    // Check cache first
    if (profileCache.has(stats.playerId)) {
      setProfile(profileCache.get(stats.playerId)!);
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
        profileCache.set(stats.playerId, profileData);
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
        <div>XP: {stats.xp}</div>
        <div>Kills: {stats.kills}</div>
        <div>Deaths: {stats.deaths}</div>
        <div>K/D: {kdr}</div>
        <div>Highest Streak: {stats.highestKillStreak}</div>
        <div>Current Streak: {stats.currentKillStreak}</div>
      </div>
    </div>
  );
};
