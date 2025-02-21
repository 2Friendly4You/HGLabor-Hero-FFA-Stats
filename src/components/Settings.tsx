import React from 'react';
import { clearPlayerCache } from '../utils/cache';

export const Settings: React.FC = () => {
    const handleClearCache = () => {
        clearPlayerCache();
        alert('Cache cleared successfully!');
    };

    return (
        <div className="settings">
            <h2>Settings</h2>
            <div className="settings-group">
                <h3>Cache Management</h3>
                <button onClick={handleClearCache} className="settings-button">
                    Clear Player Cache
                </button>
                <p className="settings-description">
                    Clears cached player names and pictures. New data will be fetched on next view.
                </p>
            </div>
        </div>
    );
};
