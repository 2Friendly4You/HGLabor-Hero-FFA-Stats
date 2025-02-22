import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="loading-spinner" aria-label="Loading content">
            <div className="spinner" role="status">
                <span className="sr-only"></span>
            </div>
        </div>
    );
};