
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ItemType, SubType } from '../types';
import { UpdateCard } from '../components/updates/UpdateCard';
import { Icon } from '../components/Icons';
import { SkeletonCard } from '../components/ui/SkeletonCard';

// Concurrent fetch manager to limit simultaneous API calls with cancellation support
class ConcurrentFetchManager {
    private activeFetches = 0;
    private maxConcurrent = 10; // Limit to 10 concurrent fetches
    private pendingQueue: Array<() => void> = [];
    private cancelled = false;
    private abortControllers: Set<AbortController> = new Set();

    async acquire(): Promise<void> {
        if (this.cancelled) {
            throw new Error('Fetch cancelled');
        }

        if (this.activeFetches < this.maxConcurrent) {
            this.activeFetches++;
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            if (this.cancelled) {
                reject(new Error('Fetch cancelled'));
                return;
            }
            this.pendingQueue.push(resolve);
        });
    }

    release(): void {
        this.activeFetches--;
        if (!this.cancelled && this.pendingQueue.length > 0 && this.activeFetches < this.maxConcurrent) {
            const next = this.pendingQueue.shift();
            if (next) {
                this.activeFetches++;
                next();
            }
        }
    }

    createAbortController(): AbortController {
        const controller = new AbortController();
        this.abortControllers.add(controller);
        return controller;
    }

    removeAbortController(controller: AbortController): void {
        this.abortControllers.delete(controller);
    }

    cancel(): void {
        this.cancelled = true;
        // Abort all ongoing requests
        this.abortControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {
                // Ignore errors when aborting
            }
        });
        this.abortControllers.clear();
        // Clear pending queue
        this.pendingQueue = [];
    }

    reset(): void {
        this.cancelled = false;
        this.activeFetches = 0;
        this.pendingQueue = [];
        this.abortControllers.clear();
    }

    getActiveCount(): number {
        return this.activeFetches;
    }

    getQueueLength(): number {
        return this.pendingQueue.length;
    }

    isCancelled(): boolean {
        return this.cancelled;
    }
}

// Per-category fetch managers
const fetchManagers = {
    anime: new ConcurrentFetchManager(),
    tvSeries: new ConcurrentFetchManager(),
    movies: new ConcurrentFetchManager()
};

const Column = ({ 
    title, 
    items, 
    isLoading, 
    isFetchTriggered, 
    onFetch, 
    onStop,
    categoryKey 
}: { 
    title: string, 
    items: any[], 
    isLoading: boolean, 
    isFetchTriggered: boolean, 
    onFetch: () => void,
    onStop: () => void,
    categoryKey: 'anime' | 'tvSeries' | 'movies'
}) => {
    const [loadingChildrenCount, setLoadingChildrenCount] = useState(0);
    const [foundUpdates, setFoundUpdates] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [isCancelled, setIsCancelled] = useState(false);
    const [updateCards, setUpdateCards] = useState<any[]>([]);

    const fetchManager = fetchManagers[categoryKey];
    const isFetchingUpdates = isFetchTriggered && loadingChildrenCount > 0 && !isCancelled;

    // Reset state only when fetch is manually triggered (not on items change)
    useEffect(() => {
        if (isFetchTriggered) {
            setLoadingChildrenCount(items.length);
            setFoundUpdates(false);
            setCompletedCount(0);
            setIsCancelled(false);
            setUpdateCards([]); // Clear previous cards
            fetchManager.reset();
        }
    }, [isFetchTriggered]); // Only depend on isFetchTriggered, not items

    // Check if fetch was cancelled
    useEffect(() => {
        if (isFetchTriggered && fetchManager.isCancelled()) {
            setIsCancelled(true);
        }
    }, [isFetchTriggered, fetchManager]);

    // Use ref to track processed items and prevent duplicate callbacks
    const processedItemsRef = useRef<Set<string>>(new Set());
    
    const handleLoadComplete = useCallback((hasUpdate: boolean, cardData?: any) => {
        if (!fetchManager.isCancelled()) {
            const itemId = cardData?.itemId || 'unknown';
            
            // Prevent duplicate processing
            if (processedItemsRef.current.has(itemId)) {
                return;
            }
            processedItemsRef.current.add(itemId);
            
            setLoadingChildrenCount(prev => Math.max(0, prev - 1));
            setCompletedCount(prev => prev + 1);
            if (hasUpdate && cardData) {
                setFoundUpdates(true);
                // Add card data to the list of update cards
                setUpdateCards(prev => {
                    // Check if card already exists (avoid duplicates)
                    const exists = prev.some(card => card.itemId === cardData.itemId);
                    if (!exists) {
                        return [...prev, cardData];
                    }
                    return prev;
                });
            }
        }
    }, [fetchManager]);
    
    // Reset processed items when fetch is triggered
    useEffect(() => {
        if (isFetchTriggered) {
            processedItemsRef.current.clear();
        }
    }, [isFetchTriggered]);

    const handleStop = useCallback(() => {
        fetchManager.cancel();
        setIsCancelled(true);
        setLoadingChildrenCount(0);
        onStop();
    }, [fetchManager, onStop]);

    const allChildrenLoaded = isFetchTriggered && !isLoading && loadingChildrenCount === 0;
    const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return (
        <div className="bg-card p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <div className="flex items-center gap-2">
                    {isFetchTriggered && isFetchingUpdates && (
                        <button
                            onClick={handleStop}
                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-destructive rounded-lg hover:bg-destructive/90 transition-all active:scale-95 shadow-sm"
                            aria-label={`Stop fetching updates for ${title}`}
                        >
                            <Icon name="x" className="h-4 w-4" />
                            Stop
                        </button>
                    )}
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
                        {isCancelled && (
                            <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center justify-center gap-2 text-yellow-800">
                                    <Icon name="alert-circle" className="h-5 w-5" />
                                    <span className="text-sm font-semibold">Fetch cancelled</span>
                                </div>
                                <p className="text-xs text-center text-yellow-700">
                                    Stopped fetching updates. {completedCount} of {items.length} items processed.
                                </p>
                            </div>
                        )}
                        {isFetchingUpdates && (
                            <div className="space-y-2 p-4 text-muted-foreground bg-secondary rounded-lg">
                                <div className="flex items-center justify-center gap-2">
                                    <Icon name="loader" className="h-5 w-5 animate-spin" />
                                    <span>Fetching updates... ({completedCount}/{items.length})</span>
                                </div>
                                {items.length > 50 && (
                                    <div className="mt-2">
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div 
                                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${progressPercent}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-center mt-1">
                                            {progressPercent}% complete • Estimated time: {Math.max(0, Math.ceil((items.length - completedCount) * 10 / 60))} minutes
                                        </p>
                                    </div>
                                )}
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
                            <>
                                {items.map(item => (
                                    <UpdateCard 
                                        key={item.id} 
                                        item={item} 
                                        onLoadComplete={handleLoadComplete}
                                        isFetchTriggered={isFetchTriggered && !isCancelled}
                                        fetchManager={fetchManager}
                                    />
                                ))}
                                {/* Show count of found updates */}
                                {allChildrenLoaded && foundUpdates && updateCards.length > 0 && (
                                    <div className="text-center p-2 bg-secondary rounded-lg">
                                        <p className="text-xs text-muted-foreground">
                                            Found {updateCards.length} update{updateCards.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                )}
                            </>
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
    
    // Effect to check for stale fetched state - only on mount, not on every watchlist change
    // This prevents resetting fetch state when navigating or when watchlist updates
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

            // Only set if different from current state to prevent unnecessary re-renders
            setFetchTriggered(prev => {
                if (prev.anime !== isAnimeFetched || prev.tvSeries !== isTvSeriesFetched || prev.movies !== isMoviesFetched) {
                    return {
                        anime: isAnimeFetched,
                        tvSeries: isTvSeriesFetched,
                        movies: isMoviesFetched
                    };
                }
                return prev;
            });
        } catch (error) {
            console.error("Error checking for stale fetch state:", error);
            // In case of parsing errors, assume not fetched to be safe.
            setFetchTriggered({ anime: false, tvSeries: false, movies: false });
        }
        // Only run once on mount, not on every watchlist change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only check on mount
    
    const handleFetch = (category: 'anime' | 'tvSeries' | 'movies') => {
        if (!isOnline) {
            showToast("You are offline. Cannot fetch updates.", 'error');
            return;
        }

        const items = category === 'anime' ? categorizedItems.anime : 
                     category === 'tvSeries' ? categorizedItems.tvSeries : 
                     categorizedItems.movies;

        // Warn user if there are many items
        if (items.length > 100) {
            const estimatedMinutes = Math.ceil(items.length * 10 / 60);
            const confirmed = window.confirm(
                `You have ${items.length} items in this category. Fetching updates will take approximately ${estimatedMinutes} minutes and make ${items.length} API calls.\n\n` +
                `Updates will be fetched in batches of 10 at a time to prevent overload. You can stop the process at any time. Do you want to continue?`
            );
            if (!confirmed) {
                return;
            }
        }

        // Reset the fetch manager for this category
        fetchManagers[category].reset();
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

    const handleStop = (category: 'anime' | 'tvSeries' | 'movies') => {
        fetchManagers[category].cancel();
        setFetchTriggered(prev => ({ ...prev, [category]: false }));
        showToast(`Stopped fetching updates for ${category === 'anime' ? 'Anime' : category === 'tvSeries' ? 'TV Series' : 'Movies'}.`, 'info');
        
        // Clear session storage for this category
        try {
            const storedIdsRaw = sessionStorage.getItem('updatesFetchedIds');
            const storedIds = storedIdsRaw ? JSON.parse(storedIdsRaw) : {};
            if (category === 'anime') delete storedIds.anime;
            if (category === 'tvSeries') delete storedIds.tvSeries;
            if (category === 'movies') delete storedIds.movies;
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
                    onStop={() => handleStop('anime')}
                    categoryKey="anime"
                />
                <Column
                    title="TV Series"
                    items={categorizedItems.tvSeries}
                    isLoading={loading}
                    isFetchTriggered={fetchTriggered.tvSeries}
                    onFetch={() => handleFetch('tvSeries')}
                    onStop={() => handleStop('tvSeries')}
                    categoryKey="tvSeries"
                />
                <Column
                    title="Movies"
                    items={categorizedItems.movies}
                    isLoading={loading}
                    isFetchTriggered={fetchTriggered.movies}
                    onFetch={() => handleFetch('movies')}
                    onStop={() => handleStop('movies')}
                    categoryKey="movies"
                />
            </div>
        </div>
    );
};