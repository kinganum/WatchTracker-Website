
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { getUpcomingRelease } from '../../services/geminiService';
import * as db from '../../services/db';
import { Icon } from '../Icons';
import { useAppContext } from '../../contexts/AppContext';
import { parseReleaseDate } from '../../utils/textFormatters';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const UpdateCardSkeleton = () => (
    <div className="bg-secondary p-4 rounded-lg animate-pulse">
        <div className="h-5 bg-muted rounded w-3/4 mb-3"></div>
        <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-full mt-1"></div>
        </div>
    </div>
);

const getStatusBadgeClass = (status) => {
    switch(status) {
        case 'Confirmed': return 'bg-green-100 text-green-800';
        case 'Rumored': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const UpdateCardComponent: React.FC<{ 
    item: any, 
    onLoadComplete: (hasUpdate: boolean, cardData?: any) => void, 
    isFetchTriggered: boolean,
    fetchManager?: any
}> = ({ item, onLoadComplete, isFetchTriggered, fetchManager }) => {
    const { isOnline } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [isReleased, setIsReleased] = useState(null);
    const [startFetch, setStartFetch] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const cardRef = useRef(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Track if we've already called onLoadComplete to prevent duplicate calls
    const hasCalledCompleteRef = useRef(false);
    
    const fetchData = useCallback(async () => {
        // Check if fetch is cancelled before starting
        if (fetchManager?.isCancelled()) {
            setLoading(false);
            setIsWaiting(false);
            return;
        }

        // Reset completion flag for new fetch
        hasCalledCompleteRef.current = false;
        setError(null);
        setLoading(true);
        let hasUpdateResult = false;
        let finalData = null;

        try {
            const cached = await db.getUpdateFromCache(item.id);
            if (cached) {
                finalData = cached.data;
                if ((Date.now() - cached.timestamp < CACHE_DURATION) || !isOnline) {
                    setData(finalData);
                    hasUpdateResult = finalData.status !== 'No Update Found';
                    setLoading(false);
                    if (!hasCalledCompleteRef.current) {
                        hasCalledCompleteRef.current = true;
                        onLoadComplete(hasUpdateResult, hasUpdateResult ? { ...finalData, itemId: item.id } : undefined);
                    }
                    return;
                }
            }
            
            if (isOnline) {
                // Check cancellation before acquiring
                if (fetchManager?.isCancelled()) {
                    setLoading(false);
                    return;
                }

                // Create abort controller for this fetch
                if (fetchManager) {
                    abortControllerRef.current = fetchManager.createAbortController();
                }

                // Acquire permission from fetch manager if available (limits concurrent fetches)
                if (fetchManager) {
                    setIsWaiting(true);
                    try {
                        await fetchManager.acquire();
                    } catch (e: any) {
                        // If cancelled during acquire, stop here
                        if (e.message === 'Fetch cancelled' || fetchManager.isCancelled()) {
                            setLoading(false);
                            setIsWaiting(false);
                            if (abortControllerRef.current) {
                                fetchManager.removeAbortController(abortControllerRef.current);
                                abortControllerRef.current = null;
                            }
                            return;
                        }
                        throw e;
                    }
                    setIsWaiting(false);
                }

                // Check cancellation again after acquiring
                if (fetchManager?.isCancelled() || abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                    if (fetchManager && abortControllerRef.current) {
                        fetchManager.removeAbortController(abortControllerRef.current);
                        fetchManager.release();
                        abortControllerRef.current = null;
                    }
                    return;
                }

                try {
                    const result = await getUpcomingRelease(item);
                    
                    // Check if cancelled during fetch
                    if (fetchManager?.isCancelled() || abortControllerRef.current?.signal.aborted) {
                        setLoading(false);
                        if (fetchManager && abortControllerRef.current) {
                            fetchManager.removeAbortController(abortControllerRef.current);
                            fetchManager.release();
                            abortControllerRef.current = null;
                        }
                        return;
                    }

                    if (typeof result === 'string') {
                        if (!finalData) setError(result);
                    } else {
                        finalData = result;
                        await db.saveUpdateToCache(item.id, result);
                    }
                } catch (fetchError: any) {
                    // Handle cancellation errors gracefully
                    if (fetchError.name === 'AbortError' || fetchError.message?.includes('cancelled') || fetchManager?.isCancelled()) {
                        setLoading(false);
                        setIsWaiting(false);
                        if (fetchManager && abortControllerRef.current) {
                            fetchManager.removeAbortController(abortControllerRef.current);
                            fetchManager.release();
                            abortControllerRef.current = null;
                        }
                        return;
                    }
                    throw fetchError;
                } finally {
                    // Always release the fetch slot and cleanup
                    if (fetchManager && abortControllerRef.current) {
                        fetchManager.removeAbortController(abortControllerRef.current);
                        fetchManager.release();
                        abortControllerRef.current = null;
                    }
                }
            } else if (!finalData) {
                // If offline and we don't have cached data, we won't show an error.
                // The global toast on the page is sufficient. The card will just not render.
            }

        } catch (e: any) {
            // Don't show errors for cancelled fetches
            if (e.message === 'Fetch cancelled' || e.name === 'AbortError' || fetchManager?.isCancelled()) {
                setLoading(false);
                setIsWaiting(false);
                return;
            }
            
            console.error("Error in fetchData:", e);
            if (!finalData) setError("An unexpected error occurred.");
            
            // Ensure we release the fetch slot even on error
            if (fetchManager && abortControllerRef.current) {
                fetchManager.removeAbortController(abortControllerRef.current);
                fetchManager.release();
                abortControllerRef.current = null;
            }
        } finally {
            // Only update state if not cancelled
            if (!fetchManager?.isCancelled()) {
                if (finalData) {
                    setData(finalData);
                    hasUpdateResult = finalData.status !== 'No Update Found';
                }
                setLoading(false);
                setIsWaiting(false);
                // Only call onLoadComplete once per fetch
                if (!hasCalledCompleteRef.current) {
                    hasCalledCompleteRef.current = true;
                    onLoadComplete(hasUpdateResult, hasUpdateResult && finalData ? { ...finalData, itemId: item.id } : undefined);
                }
            }
        }
    }, [item.id, isOnline, onLoadComplete, fetchManager]);

    // Only start fetching when manually triggered (isFetchTriggered is true)
    // No auto-fetching via IntersectionObserver
    useEffect(() => {
        if (isFetchTriggered && !startFetch) {
            setStartFetch(true);
        }
    }, [isFetchTriggered]);

    useEffect(() => {
        if (startFetch && isFetchTriggered) {
            fetchData();
        }
    }, [startFetch, isFetchTriggered, fetchData]);

    useEffect(() => {
        if (data?.release_date) {
            const releaseDate = parseReleaseDate(data.release_date);
            if (releaseDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Compare dates only, not time
                const newIsReleased = releaseDate < today;
                // Only update if value actually changed
                setIsReleased(prev => prev !== newIsReleased ? newIsReleased : prev);
            } else {
                setIsReleased(prev => prev !== null ? null : prev);
            }
        }
    }, [data?.release_date]); // Only depend on release_date, not entire data object

    // Don't render anything until fetch is triggered
    if (!isFetchTriggered) {
        return null;
    }

    // Show loading state only while actively fetching
    if (loading || isWaiting) {
        return null; // Don't show loading cards - only show results
    }

    // Don't show error cards - errors are handled by toasts
    if (error) {
        return null;
    }
    
    // Only render if we have data AND it's not "No Update Found"
    if (!data || data.status === 'No Update Found') {
        return null; // Don't render a card if no update is found
    }

    // Memoize the card content to prevent re-renders when parent state changes
    return (
        <div className="bg-secondary p-4 rounded-lg border border-border" style={{ willChange: 'auto' }}>
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-foreground">{data.new_title}</h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeClass(data.status)}`}>
                    {data.status}
                </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Based on: {item.title}</p>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <Icon name="tv" className="h-4 w-4 text-primary" />
                    <span>{data.next_installment}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Icon name="calendar" className="h-4 w-4 text-primary" />
                    <span>{data.release_date}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Icon name="play" className="h-4 w-4 text-primary" />
                    <span>{data.platform}</span>
                </div>
                {isReleased !== null && (
                    <div className="flex items-center gap-2">
                        <Icon name="zap" className="h-4 w-4 text-primary" />
                         <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isReleased ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {isReleased ? 'Released' : 'Coming Soon'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
export const UpdateCard = memo(UpdateCardComponent, (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render), false if different (re-render)
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.isFetchTriggered === nextProps.isFetchTriggered &&
        prevProps.fetchManager === nextProps.fetchManager &&
        prevProps.onLoadComplete === nextProps.onLoadComplete
    );
});