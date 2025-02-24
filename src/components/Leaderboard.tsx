import React, { useEffect, useState, useCallback } from 'react';
import { PlayerStats, SortOption } from '../types/ApiTypes';
import { PlayerCard } from './PlayerCard';
import { PlayerSearch } from './PlayerSearch';
import { LoadingSpinner } from './LoadingSpinner';
import { FaTrophy, FaSkull, FaBolt, FaFire, FaStar, FaCoins, FaChevronLeft, FaChevronRight, FaChartLine, FaSync } from 'react-icons/fa';
import { Settings } from './Settings';
import { PlayerView } from './PlayerView';
import { db } from '../utils/database';

const PaginationControls: React.FC<{
    currentPage: number;
    hasNextPage: boolean;
    onPrevious: () => void;
    onNext: () => void;
    isLoading: boolean;
    disabled?: boolean;
    isBackgroundLoading?: boolean;
}> = ({ currentPage, hasNextPage, onPrevious, onNext, isLoading, disabled, isBackgroundLoading }) => (
    <div className="pagination">
        <button 
            onClick={onPrevious} 
            disabled={currentPage === 1 || isLoading || disabled || isBackgroundLoading}
            className={`pagination-button ${isBackgroundLoading ? 'loading' : ''}`}
        >
            <FaChevronLeft /> Previous
        </button>
        <span className="page-number">Page {currentPage}</span>
        <button 
            onClick={onNext}
            disabled={!hasNextPage || isLoading || disabled || isBackgroundLoading}
            className={`pagination-button ${isBackgroundLoading ? 'loading' : ''}`}
        >
            Next <FaChevronRight />
        </button>
    </div>
);

export const Leaderboard: React.FC = () => {
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [sort, setSort] = useState<SortOption>('kills');
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'search' | 'settings' | 'player'>('leaderboard');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

    const getSortIcon = (sortValue: SortOption) => {
        switch (sortValue) {
            case 'kills': return <FaBolt />;
            case 'xp': return <FaStar />;
            case 'deaths': return <FaSkull />;
            case 'currentKillStreak': return <FaFire />;
            case 'highestKillStreak': return <FaTrophy />;
            case 'bounty': return <FaCoins />;
            case 'kd': return <FaChartLine />;
        }
    };

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(playerId);
        setActiveTab('player');
    };

    const handleBackFromPlayer = () => {
        setSelectedPlayerId(null);
        setActiveTab('leaderboard');
    };

    useEffect(() => {
        const handleDatabaseUpdate = (event: CustomEvent<{ oldData: PlayerStats[], newData: PlayerStats[] }>) => {
            setPlayers(prev => {
                const currentIds = new Set(prev.map(p => p.playerId));
                const newPlayers = event.detail.newData
                    .filter((p: PlayerStats) => currentIds.has(p.playerId))
                    .sort((a: PlayerStats, b: PlayerStats) => {
                        if (sort === 'kd') {
                            const kdA = (a.kills || 0) / Math.max(1, a.deaths || 1);
                            const kdB = (b.kills || 0) / Math.max(1, b.deaths || 1);
                            return kdB - kdA;
                        }
                        return (b[sort] || 0) - (a[sort] || 0);
                    });
                return newPlayers;
            });
            setLastUpdateTime(new Date());
        };

        window.addEventListener('database-updated', handleDatabaseUpdate as EventListener);
        return () => {
            window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener);
        };
    }, [sort]);

    const updatePaginationState = useCallback(() => {
        if (db.isFullyLoaded()) {
            setHasNextPage(db.hasNextPage(sort, currentPage));
        }
    }, [sort, currentPage]);

    useEffect(() => {
        const handlePaginationUpdate = () => {
            requestAnimationFrame(() => {
                updatePaginationState();
            });
        };

        window.addEventListener('database-pagination-update', handlePaginationUpdate);
        window.addEventListener('database-load-complete', handlePaginationUpdate);

        return () => {
            window.removeEventListener('database-pagination-update', handlePaginationUpdate);
            window.removeEventListener('database-load-complete', handlePaginationUpdate);
        };
    }, [updatePaginationState]);

    useEffect(() => {
        const handleDatabaseLoaded = () => {
            setTimeout(() => {
                console.debug('Database load complete, updating pagination');
                setIsBackgroundLoading(false);
                updatePaginationState();
            }, 500);
        };

        window.addEventListener('database-load-complete', handleDatabaseLoaded);
        
        // Check initial state
        if (db.isFullyLoaded()) {
            setIsBackgroundLoading(false);
            setIsInitialLoad(false);
            updatePaginationState();
        }

        return () => {
            window.removeEventListener('database-load-complete', handleDatabaseLoaded);
        };
    }, [updatePaginationState]);

    useEffect(() => {
        updatePaginationState();
    }, [sort, currentPage, updatePaginationState]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const data = await db.getLeaderboard(sort, currentPage);
                setPlayers(data);
                
                // Update hasNextPage after getting new data
                if (db.isFullyLoaded()) {
                    setHasNextPage(db.hasNextPage(sort, currentPage));
                }
                
                if (isInitialLoad && db.isInitialLoadComplete()) {
                    console.debug('Initial load complete, checking full load status');
                    setIsInitialLoad(false);
                    setIsBackgroundLoading(!db.isFullyLoaded());
                }
            } catch (err) {
                const error = err as Error;
                setError(error.message || 'Failed to load data');
                setPlayers([]);
                setHasNextPage(false);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sort, currentPage, isInitialLoad]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (hasNextPage) {
            setCurrentPage(prev => prev + 1);
        }
    };

    return (
        <div className="leaderboard">
            <h1>Hero FFA Stats</h1>
            {activeTab !== 'player' && (
                <div className="tabs">
                    <button 
                        className={activeTab === 'leaderboard' ? 'active' : ''} 
                        onClick={() => setActiveTab('leaderboard')}
                    >
                        Leaderboard
                    </button>
                    <button 
                        className={activeTab === 'search' ? 'active' : ''} 
                        onClick={() => setActiveTab('search')}
                    >
                        Player Search
                    </button>
                    <button 
                        className={activeTab === 'settings' ? 'active' : ''} 
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </div>
            )}
            {activeTab === 'leaderboard' ? (
                <div className="leaderboard-content">
                    <div className="leaderboard-header">
                        <div className="sort-container">
                            <div className="sort-icon">{getSortIcon(sort)}</div>
                            <select 
                                value={sort} 
                                onChange={(e) => setSort(e.target.value as SortOption)}
                                disabled={isInitialLoad || isBackgroundLoading}
                                className={isBackgroundLoading ? 'loading' : ''}
                            >
                                <option value="kills">Sort by Kills</option>
                                <option value="xp">Sort by XP</option>
                                <option value="deaths">Sort by Deaths</option>
                                <option value="currentKillStreak">Sort by Current Streak</option>
                                <option value="highestKillStreak">Sort by Highest Streak</option>
                                <option value="bounty">Sort by Bounty</option>
                                <option value="kd">Sort by K/D Ratio</option>
                            </select>
                        </div>
                        {lastUpdateTime && (
                            <div className="last-update">
                                Last updated: {lastUpdateTime.toLocaleTimeString()}
                                {isBackgroundLoading && (
                                    <div className="loading-status">
                                        <FaSync className="loading-icon" />
                                        <span>Loading more data...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <PaginationControls 
                        currentPage={currentPage}
                        hasNextPage={hasNextPage}
                        onPrevious={handlePreviousPage}
                        onNext={handleNextPage}
                        isLoading={loading}
                        disabled={isInitialLoad}
                        isBackgroundLoading={isBackgroundLoading}
                    />
                    <div className="players-grid">
                        {loading && isInitialLoad ? (
                            <LoadingSpinner />
                        ) : error ? (
                            <div className="no-data-message">{error}</div>
                        ) : (
                            players
                                .filter((player, index, self) => 
                                    index === self.findIndex(p => p.playerId === player.playerId)
                                )
                                .map((player, index) => (
                                    <div 
                                        key={`${player.playerId}-${currentPage}-${index}`}
                                        onClick={() => !isInitialLoad && handlePlayerClick(player.playerId)}
                                        className={`player-card-wrapper ${isInitialLoad ? 'disabled' : ''}`}
                                    >
                                        <PlayerCard 
                                            stats={player} 
                                            rank={(currentPage - 1) * 100 + index + 1}
                                        />
                                    </div>
                                ))
                        )}
                    </div>
                    <PaginationControls 
                        currentPage={currentPage}
                        hasNextPage={hasNextPage}
                        onPrevious={handlePreviousPage}
                        onNext={handleNextPage}
                        isLoading={loading}
                        disabled={isInitialLoad}
                        isBackgroundLoading={isBackgroundLoading}
                    />
                </div>
            ) : activeTab === 'search' ? (
                <PlayerSearch onPlayerSelect={handlePlayerClick} />
            ) : activeTab === 'player' && selectedPlayerId ? (
                <PlayerView playerId={selectedPlayerId} onBack={handleBackFromPlayer} />
            ) : (
                <Settings />
            )}
        </div>
    );
};