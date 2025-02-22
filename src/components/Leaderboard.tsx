import React, { useEffect, useState } from 'react';
import { PlayerStats, SortOption } from '../types/ApiTypes';
import { PlayerCard } from './PlayerCard';
import { PlayerSearch } from './PlayerSearch';
import { LoadingSpinner } from './LoadingSpinner';
import { FaTrophy, FaSkull, FaBolt, FaChartLine, FaFire, FaStar, FaCoins, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Settings } from './Settings';

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
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'search' | 'settings'>('leaderboard');
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
        }
    };

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`https://api.hglabor.de/stats/ffa/top?sort=${sort}&page=${currentPage}`)
            .then(res => {
                if (res.status === 404) {
                    throw new Error('No data found');
                }
                if (!res.ok) {
                    throw new Error('Failed to fetch data');
                }
                return res.json();
            })
            .then(data => {
                setPlayers(data);
                setHasNextPage(data.length === 100); // If we get 100 items, there might be more
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
                            players.map((player, index) => (
                                <PlayerCard 
                                    key={player.playerId} 
                                    stats={player} 
                                    rank={(currentPage - 1) * 100 + index + 1}
                                />
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
                <PlayerSearch />
            ) : (
                <Settings />
            )}
        </div>
    );
};