
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ItemType, SubType } from '../types';
import { UpdateCard } from '../components/updates/UpdateCard';
import { Icon } from '../components/Icons';
import { SkeletonCard } from '../components/ui/SkeletonCard';

const Column = ({ title, items, isLoading, isFetchTriggered, onFetch }: { title: string, items: any[], isLoading: boolean, isFetchTriggered: boolean, onFetch: () => void }) => {
    const [loadingChildrenCount, setLoadingChildrenCount] = useState(0);
    const [foundUpdates, setFoundUpdates] = useState(false);

    const isFetchingUpdates = isFetchTriggered && loadingChildrenCount > 0;

    useEffect(() => {
        if (isFetchTriggered) {
            setLoadingChildrenCount(items.length);
            setFoundUpdates(false);
        }
    }, [items, isFetchTriggered]);

    const handleLoadComplete = useCallback((hasUpdate: boolean) => {
        setLoadingChildrenCount(prev => Math.max(0, prev - 1));
        if (hasUpdate) {
            setFoundUpdates(true);
        }
    }, []);

    const allChildrenLoaded = isFetchTriggered && !isLoading && loadingChildrenCount === 0;

    return (
        <div className="bg-card p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                {!isFetchTriggered && (
                    <button
                        onClick={onFetch}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all active:scale-95"
                        aria-label={`Fetch updates for ${title}`}
                    >
                        <Icon name="zap" className="h-4 w-4" />
                        Fetch
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {isLoading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : !isFetchTriggered ? (
                    <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Click "Fetch" to check for updates.</p>
                    </div>
                ) : (
                    <>
                        {isFetchingUpdates && (
                            <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground bg-secondary rounded-lg">
                                <Icon name="loader" className="h-5 w-5" />
                                <span>Fetching updates...</span>
                            </div>
                        )}
                        {allChildrenLoaded && !foundUpdates && items.length > 0 && (
                             <div className="text-center p-4 bg-secondary rounded-lg">
                                <Icon name="check-circle" className="h-8 w-8 text-green-500 mx-auto" />
                                <p className="mt-2 text-sm font-semibold text-foreground">All caught up!</p>
                                <p className="text-xs text-muted-foreground">No new announcements found.</p>
                            </div>
                        )}
                        {items.length > 0 ? (
                            items.map(item => <UpdateCard key={item.id} item={item} onLoadComplete={handleLoadComplete} isFetchTriggered={isFetchTriggered} />)
                        ) : (
                            <p className="text-muted-foreground text-sm p-4 text-center bg-secondary rounded-lg">
                                No items of this type in your watchlist.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export const UpdatesPage = () => {
    const { watchlist, loading, isOnline, showToast } = useAppContext();
    const [fetchTriggered, setFetchTriggered] = useState({ anime: false, tvSeries: false, movies: false });

    const categorizedItems = useMemo(() => {
        const anime: any[] = [];
        const tvSeries: any[] = [];
        const movies: any[] = [];

        watchlist.forEach((item: any) => {
            if (item.sub_type === SubType.ANIME) {
                anime.push(item);
            } else if (item.type === ItemType.TV_SERIES) {
                tvSeries.push(item);
            } else if (item.type === ItemType.MOVIES) {
                movies.push(item);
            }
        });

        return { anime, tvSeries, movies };
    }, [watchlist]);
    
    // Effect to check for stale fetched state when the underlying watchlist changes.
    useEffect(() => {
        try {
            const storedIdsRaw = sessionStorage.getItem('updatesFetchedIds');
            const storedIds = storedIdsRaw ? JSON.parse(storedIdsRaw) : {};

            const createIdString = (items: any[]) => items.map(i => i.id).sort().join(',');

            const animeIds = createIdString(categorizedItems.anime);
            const tvSeriesIds = createIdString(categorizedItems.tvSeries);
            const moviesIds = createIdString(categorizedItems.movies);

            // If the current list of IDs matches what we last fetched, consider it fetched. Otherwise, the state is stale.
            const isAnimeFetched = animeIds.length > 0 && storedIds.anime === animeIds;
            const isTvSeriesFetched = tvSeriesIds.length > 0 && storedIds.tvSeries === tvSeriesIds;
            const isMoviesFetched = moviesIds.length > 0 && storedIds.movies === moviesIds;

            setFetchTriggered({
                anime: isAnimeFetched,
                tvSeries: isTvSeriesFetched,
                movies: isMoviesFetched
            });
        } catch (error) {
            console.error("Error checking for stale fetch state:", error);
            // In case of parsing errors, assume not fetched to be safe.
            setFetchTriggered({ anime: false, tvSeries: false, movies: false });
        }
    }, [categorizedItems.anime, categorizedItems.tvSeries, categorizedItems.movies]);
    
    const handleFetch = (category: 'anime' | 'tvSeries' | 'movies') => {
        if (!isOnline) {
            showToast("You are offline. Cannot fetch updates.", 'error');
            return;
        }
        setFetchTriggered(prev => ({ ...prev, [category]: true }));

        // Store the current IDs in session storage to track what was fetched.
        try {
            const storedIdsRaw = sessionStorage.getItem('updatesFetchedIds');
            const storedIds = storedIdsRaw ? JSON.parse(storedIdsRaw) : {};
            const createIdString = (items: any[]) => items.map(i => i.id).sort().join(',');
            
            if (category === 'anime') storedIds.anime = createIdString(categorizedItems.anime);
            if (category === 'tvSeries') storedIds.tvSeries = createIdString(categorizedItems.tvSeries);
            if (category === 'movies') storedIds.movies = createIdString(categorizedItems.movies);

            sessionStorage.setItem('updatesFetchedIds', JSON.stringify(storedIds));
        } catch (error) {
            console.error("Failed to update session storage:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Upcoming Releases</h1>
                <p className="mt-2 text-muted-foreground">Check for new seasons, movies, and sequels for items in your watchlist.</p>
                {!isOnline && (
                    <p className="mt-2 text-sm font-semibold text-yellow-600 bg-yellow-100 p-2 rounded-md">
                        You are offline. Data shown may be from the last time you were connected.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Column
                    title="Anime"
                    items={categorizedItems.anime}
                    isLoading={loading}
                    isFetchTriggered={fetchTriggered.anime}
                    onFetch={() => handleFetch('anime')}
                />
                <Column
                    title="TV Series"
                    items={categorizedItems.tvSeries}
                    isLoading={loading}
                    isFetchTriggered={fetchTriggered.tvSeries}
                    onFetch={() => handleFetch('tvSeries')}
                />
                <Column
                    title="Movies"
                    items={categorizedItems.movies}
                    isLoading={loading}
                    isFetchTriggered={fetchTriggered.movies}
                    onFetch={() => handleFetch('movies')}
                />
            </div>
        </div>
    );
};