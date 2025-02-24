import React, { useEffect, useState } from 'react';
import { PlayerStats, SortOption } from '../types/ApiTypes';
import { PlayerCard } from './PlayerCard';
import { PlayerSearch } from './PlayerSearch';
import { LoadingSpinner } from './LoadingSpinner';
import { FaTrophy, FaSkull, FaBolt, FaFire, FaStar, FaCoins, FaChevronLeft, FaChevronRight, FaChartLine } from 'react-icons/fa';
import { Settings } from './Settings';
import { PlayerView } from './PlayerView';
import { db } from '../utils/database';

const PaginationControls: React.FC<{
    currentPage: number;
    hasNextPage: boolean;
    onPrevious: () => void;
    onNext: () => void;
    isLoading: boolean;
}> = ({ currentPage, hasNextPage, onPrevious, onNext, isLoading }) => (
    <div className="pagination">
        <button 
            onClick={onPrevious} 
            disabled={currentPage === 1 || isLoading}
            className="pagination-button"
        >
            <FaChevronLeft /> Previous
        </button>
        <span className="page-number">Page {currentPage}</span>
        <button 
            onClick={onNext}
            disabled={!hasNextPage || isLoading}
            className="pagination-button"
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
        setLoading(true);
        setError(null);
        
        db.getLeaderboard(sort, currentPage)
            .then(data => {
                setPlayers(data);
                setHasNextPage(db.hasNextPage(sort, currentPage));
            })
            .catch(err => {
                setError(err.message);
                setPlayers([]);
                setHasNextPage(false);
            })
            .finally(() => setLoading(false));
    }, [sort, currentPage]);

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
                    <div className="sort-container">
                        <div className="sort-icon">{getSortIcon(sort)}</div>
                        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
                            <option value="kills">Sort by Kills</option>
                            <option value="xp">Sort by XP</option>
                            <option value="deaths">Sort by Deaths</option>
                            <option value="currentKillStreak">Sort by Current Streak</option>
                            <option value="highestKillStreak">Sort by Highest Streak</option>
                            <option value="bounty">Sort by Bounty</option>
                            <option value="kd">Sort by K/D Ratio</option>
                        </select>
                    </div>
                    <PaginationControls 
                        currentPage={currentPage}
                        hasNextPage={hasNextPage}
                        onPrevious={handlePreviousPage}
                        onNext={handleNextPage}
                        isLoading={loading}
                    />
                    <div className="players-grid">
                        {loading ? (
                            <LoadingSpinner />
                        ) : error ? (
                            <div className="no-data-message">{error}</div>
                        ) : (
                            players
                                .filter((player, index, self) => 
                                    // Ensure unique players by playerId
                                    index === self.findIndex(p => p.playerId === player.playerId)
                                )
                                .map((player, index) => (
                                    <div 
                                        key={`${player.playerId}-${currentPage}-${index}`}
                                        onClick={() => handlePlayerClick(player.playerId)}
                                        className="player-card-wrapper"
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