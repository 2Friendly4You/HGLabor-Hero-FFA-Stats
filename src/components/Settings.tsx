import React from 'react';
import { clearPlayerCache } from '../utils/cache';
import { db } from '../utils/database';

export const Settings: React.FC = () => {
    const handleClearPlayerCache = () => {
        clearPlayerCache();
        alert('Player cache cleared successfully!');
    };

    const handleClearLeaderboardCache = () => {
        db.clearLeaderboardCache();
        alert('Leaderboard cache cleared successfully! New data will be loaded in the background.');
    };

    return (
        <div className="settings">
            <h2>Settings</h2>
            <div className="settings-group">
                <h3>Cache Management</h3>
                <button onClick={handleClearPlayerCache} className="settings-button">
                    Clear Player Cache
                </button>
                <p className="settings-description">
                    Clears cached player names and pictures. New data will be fetched on next view.
                </p>
                
                <button onClick={handleClearLeaderboardCache} className="settings-button">
                    Clear Leaderboard Cache
                </button>
                <p className="settings-description">
                    Clears cached leaderboard data and reloads it in the background. Data is cached for 24 hours.
                </p>
            </div>
        </div>
    );
};
