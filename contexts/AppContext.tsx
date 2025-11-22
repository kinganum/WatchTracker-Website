
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../services/supabase';
import * as db from '../services/db';
import { formatTitle } from '../utils/textFormatters';

const AppContext = createContext<any>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode, user: any }> = ({ children, user }) => {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [appLoading, setAppLoading] = useState(true);
    
    // Initialize view from URL or default to 'home'
    const [view, setViewState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') || 'home';
        }
        return 'home';
    });

    const [editingItem, setEditingItem] = useState(null);
    const [geminiItem, setGeminiItem] = useState(null);
    const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{ message: string, type: string } | null>(null);
    const [initialSearch, setInitialSearch] = useState('');
    const [confirmation, setConfirmation] = useState<any>(null);
    const [scrollToId, setScrollToId] = useState<string | null>(null);
    const [initialListFilter, setInitialListFilter] = useState(null);
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);

    // Update URL when view changes
    const setView = (newView: string) => {
        setViewState(newView);
        const url = new URL(window.location.href);
        url.searchParams.set('view', newView);
        window.history.pushState({}, '', url);
    };
    
    // Listen for back/forward button navigation
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            setViewState(params.get('view') || 'home');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    const showToast = useCallback((message: string, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const updatePendingSyncIds = async () => {
        const actions = await db.getActionsFromQueue();
        const ids = new Set<string>();
        actions.forEach((action: any) => {
            if (action.type === 'ADD') ids.add(action.payload.id);
            if (action.type === 'ADD_MULTIPLE') action.payload.forEach((p: any) => ids.add(p.id));
            if (action.type === 'UPDATE' || action.type === 'DELETE') ids.add(action.payload.id);
            if (action.type === 'DELETE_MULTIPLE') action.payload.forEach((id: string) => ids.add(id));
        });
        setPendingSyncIds(Array.from(ids));
    };

    const addItem = async (item: any) => {
        if (!user) return;
        
        const normTitle = item.title.trim().toLowerCase();
        const normType = item.type.trim().toLowerCase();
        if (watchlist.some(i => i.title.trim().toLowerCase() === normTitle && i.type.trim().toLowerCase() === normType)) {
            showToast('This item is already in your watchlist.', 'success');
            return undefined;
        }

        const newItemId = crypto.randomUUID();
        const newItem = { ...item, id: newItemId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: user.id, favorite: item.favorite || false, title: formatTitle(item.title) };
        
        const newWatchlist = [newItem, ...watchlist];
        setWatchlist(newWatchlist);
        setHighlightedIds(current => [...current, newItemId]);
        setScrollToId(newItemId);
        setPendingSyncIds(current => [...current, newItemId]);

        if (!isOnline) {
            await db.saveWatchlist(newWatchlist);
            await db.addActionToQueue({ type: 'ADD', payload: newItem });
            showToast('Item saved locally. Will sync when online.', 'success');
            return newItemId;
        }
        
        const { ['created_at']: _, ['updated_at']: __, ...newItemPayload } = newItem;
        const { data, error } = await supabase.from('watchlist').insert(newItemPayload).select().single();
        
        setPendingSyncIds(current => current.filter(id => id !== newItemId));

        if (error) {
            console.error('Error adding item:', error);
            showToast('Failed to add item.', 'error');
            setWatchlist(current => current.filter(i => i.id !== newItemId));
            setHighlightedIds(current => current.filter(id => id !== newItemId));
            return undefined;
        } else {
            setWatchlist(current => current.map(i => i.id === newItemId ? data : i));
            showToast('Item added successfully!', 'success');
            return data.id;
        }
    };
    
    const addMultipleItems = async (items: any[]) => {
        if (!user || items.length === 0) return;
        
        const newItems = items.map((item) => ({ ...item, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: user.id, favorite: item.favorite || false, title: formatTitle(item.title) }));
        const newIds = newItems.map(i => i.id);
        
        const newWatchlist = [...newItems.slice().reverse(), ...watchlist];
        setWatchlist(newWatchlist);
        setHighlightedIds(current => [...current, ...newIds]);
        setPendingSyncIds(current => [...current, ...newIds]);
        if (newIds.length > 0) setScrollToId(newIds[0]);

        if (!isOnline) {
            await db.saveWatchlist(newWatchlist);
            await db.addActionToQueue({ type: 'ADD_MULTIPLE', payload: newItems });
            showToast(`${items.length} items saved locally. Will sync when online.`, 'success');
            return;
        }

        const newItemsPayload = newItems.map(item => {
            const { ['created_at']: _, ['updated_at']: __, ...payload } = item;
            return payload;
        });
        const { data, error } = await supabase.from('watchlist').insert(newItemsPayload).select();
        
        setPendingSyncIds(current => current.filter(id => !newIds.includes(id)));
        
        if (error) {
            console.error('Error adding multiple items:', error);
            showToast('Failed to add some items.', 'error');
            setWatchlist(current => current.filter(i => !newIds.includes(i.id)));
            setHighlightedIds(current => current.filter(id => !newIds.includes(id)));
        } else if (data) {
             setWatchlist(current => {
                const dataMap = new Map(data.map(item => [item.id, item]));
                const newIdsSet = new Set(newIds);
                return current
                    .map(item => {
                        if (newIdsSet.has(item.id)) {
                            return dataMap.get(item.id);
                        }
                        return item;
                    })
                    .filter((item) => !!item);
            });
            showToast(`${data.length} items added successfully.`, 'success');
        }
    };

    const updateItem = useCallback(async (id: string, updates: any, options?: { successMessage?: string | null }) => {
        const originalItem = watchlist.find(item => item.id === id);
        if (!originalItem) return false;
        const updatedItem = { ...originalItem, ...updates, updated_at: new Date().toISOString() };
        const newWatchlist = watchlist.map(item => item.id === id ? updatedItem : item);
        setWatchlist(newWatchlist);
        setPendingSyncIds(current => [...current, id]);


        if (!isOnline) {
            await db.saveWatchlist(newWatchlist);
            const queue = await db.getActionsFromQueue();
            
            const addAction = queue.find((a: any) => (a.type === 'ADD' && a.payload.id === id) || (a.type === 'ADD_MULTIPLE' && a.payload.some((p: any) => p.id === id)));
            if (addAction) {
                let newPayload;
                if (addAction.type === 'ADD') {
                    newPayload = { ...addAction.payload, ...updates };
                } else { // ADD_MULTIPLE
                    newPayload = addAction.payload.map((p: any) => p.id === id ? { ...p, ...updates } : p);
                }
                await db.updateActionInQueue({ ...addAction, payload: newPayload });
            } else {
                const updateAction = queue.find((a: any) => a.type === 'UPDATE' && a.payload.id === id);
                if (updateAction) {
                    const newUpdates = { ...updateAction.payload.updates, ...updates };
                    await db.updateActionInQueue({ ...updateAction, payload: { id, updates: newUpdates } });
                } else {
                    await db.addActionToQueue({ type: 'UPDATE', payload: { id, updates } });
                }
            }
            showToast('Changes saved locally. Will sync when online.', 'success');
            return true;
        }

        const updatePayload = { ...updates, updated_at: new Date().toISOString() };
        if (typeof updatePayload.title === 'string') updatePayload.title = formatTitle(updatePayload.title);
        delete updatePayload.id; delete updatePayload.created_at; delete updatePayload.user_id;

        const { error } = await supabase.from('watchlist').update(updatePayload).eq('id', id);
        setPendingSyncIds(current => current.filter(pid => pid !== id));
    
        if (error) {
            console.error('Error updating item:', error.message || error);
            showToast('Failed to update item.', 'error');
            setWatchlist(current => current.map(item => item.id === id ? originalItem : item));
            return false;
        } else {
            const message = options?.successMessage === undefined ? 'Item updated!' : options.successMessage;
            if (message) showToast(message, 'success');
            return true;
        }
    }, [watchlist, showToast, isOnline]);

    const deleteItem = useCallback(async (id: string) => {
        const originalWatchlist = [...watchlist];
        const newWatchlist = watchlist.filter(item => item.id !== id);
        setWatchlist(newWatchlist);
        setPendingSyncIds(current => [...current, id]);
    
        if (!isOnline) {
            await db.saveWatchlist(newWatchlist);
            const queue = await db.getActionsFromQueue();

            const addAction = queue.find((a: any) => (a.type === 'ADD' && a.payload.id === id) || (a.type === 'ADD_MULTIPLE' && a.payload.some((p: any) => p.id === id)));

            if (addAction) {
                if (addAction.type === 'ADD') {
                    await db.removeActionFromQueue(addAction.id);
                } else { // ADD_MULTIPLE
                    const newPayload = addAction.payload.filter((p: any) => p.id !== id);
                    if (newPayload.length === 0) {
                        await db.removeActionFromQueue(addAction.id);
                    } else {
                        await db.updateActionInQueue({ ...addAction, payload: newPayload });
                    }
                }
            } else {
                const updateAction = queue.find((a: any) => a.type === 'UPDATE' && a.payload.id === id);
                if (updateAction) await db.removeActionFromQueue(updateAction.id);
                
                const deleteAction = queue.find((a: any) => a.type === 'DELETE' && a.payload.id === id);
                if (!deleteAction) { // Avoid duplicate deletes
                    await db.addActionToQueue({ type: 'DELETE', payload: { id } });
                }
            }
            showToast('Item removed locally. Will sync when online.', 'success');
            return;
        }
    
        const { error } = await supabase.from('watchlist').delete().eq('id', id);
        setPendingSyncIds(current => current.filter(pid => pid !== id));
        if (error) {
            console.error('Error deleting item:', error);
            showToast('Failed to delete item.', 'error');
            setWatchlist(originalWatchlist);
        } else {
            showToast('Item deleted.', 'success');
        }
    }, [watchlist, showToast, isOnline]);

    const deleteMultipleItems = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        const originalWatchlist = [...watchlist];
        const newWatchlist = watchlist.filter(item => !ids.includes(item.id));
        setWatchlist(newWatchlist);
        setPendingSyncIds(current => [...current, ...ids]);
        
        if (!isOnline) {
            await db.saveWatchlist(newWatchlist);
            await db.addActionToQueue({ type: 'DELETE_MULTIPLE', payload: ids });
            showToast(`${ids.length} items removed locally. Will sync when online.`, 'success');
            return;
        }

        const { error } = await supabase.from('watchlist').delete().in('id', ids);
        setPendingSyncIds(current => current.filter(pid => !ids.includes(pid)));

        if (error) {
            console.error('Error deleting multiple items:', error);
            showToast('Failed to delete items.', 'error');
            setWatchlist(originalWatchlist);
        } else {
            showToast(`${ids.length} items deleted.`, 'success');
        }
    }, [watchlist, showToast, isOnline]);
    
    const syncOfflineChanges = useCallback(async () => {
        if (!user || !isOnline || isSyncing) return;
    
        const actions = await db.getActionsFromQueue();
        if (actions.length === 0) {
            const { data } = await supabase.from('watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) {
               setWatchlist(data);
               await db.saveWatchlist(data);
            }
            return;
        };
    
        setIsSyncing(true);
        showToast('Syncing offline changes...', 'success');
    
        for (const action of actions) {
            try {
                if (action.type === 'ADD') {
                    const { ['created_at']: _, ['updated_at']: __, ...payload } = action.payload;
                    const { error } = await supabase.from('watchlist').insert(payload);
                    if (error && error.code !== '23505') throw error; 
                } else if (action.type === 'ADD_MULTIPLE') {
                    const payloads = action.payload.map((p: any) => { const { ['created_at']: _, ['updated_at']: __, ...newP } = p; return newP; });
                    const { error } = await supabase.from('watchlist').insert(payloads);
                    if (error && error.code !== '23505') throw error;
                } else if (action.type === 'UPDATE') {
                    const { id, updates } = action.payload;
                    const { error } = await supabase.from('watchlist').update(updates).eq('id', id);
                    if (error && (error as any).code !== 'PGRST116') throw error;
                } else if (action.type === 'DELETE') {
                    const { id } = action.payload;
                    const { error } = await supabase.from('watchlist').delete().eq('id', id);
                    if (error && (error as any).code !== 'PGRST116') throw error;
                } else if (action.type === 'DELETE_MULTIPLE') {
                    const ids = action.payload;
                    const { error } = await supabase.from('watchlist').delete().in('id', ids);
                    if (error) throw error;
                }
                
                await db.removeActionFromQueue(action.id);
            } catch(error: any) {
                console.error(`Failed to sync action ${action.id} (${action.type}):`, error);
                if (error.code === 'PGRST116') { 
                     console.warn(`Action ${action.id} (${action.type}) failed because item was not found. Skipping.`);
                     await db.removeActionFromQueue(action.id);
                } else {
                    showToast(`Failed to sync some changes. Please refresh.`, 'error');
                    setIsSyncing(false);
                    await updatePendingSyncIds();
                    return; 
                }
            }
        }
        
        const { data } = await supabase.from('watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        
        setIsSyncing(false);
        await updatePendingSyncIds();

        if (data) {
            setWatchlist(data);
            await db.saveWatchlist(data);
            showToast('Offline changes synced successfully!', 'success');
        } else {
            showToast('Sync complete, but failed to fetch latest data.', 'error');
        }
    }, [user, isOnline, isSyncing, showToast]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            showToast('You are back online!', 'success');
            syncOfflineChanges();
        };
        const handleOffline = () => {
            setIsOnline(false);
            showToast('You are offline. Changes will be saved locally.', 'success');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showToast, syncOfflineChanges]);
    
    useEffect(() => {
        const initializeApp = async () => {
            if (user) {
                setAppLoading(true);
                const cachedData = await db.getWatchlist();
                setWatchlist(cachedData || []);
                await updatePendingSyncIds();
                setAppLoading(false);

                if (navigator.onLine) {
                    await syncOfflineChanges();
                }
            } else {
                setWatchlist([]);
                setAppLoading(false);
            }
        };
        initializeApp();
    }, [user, syncOfflineChanges]);
    
    useEffect(() => {
        if (!user || !isOnline) return;

        const channel = supabase
            .channel(`watchlist_changes_${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'watchlist',
                filter: `user_id=eq.${user.id}`
            },
                (payload: any) => {
                    if (isSyncing) return;

                    if (payload.eventType === 'INSERT') {
                        const newItem = payload.new;
                        setWatchlist(current => {
                            if (!current.some(item => item.id === newItem.id)) {
                                return [...current, newItem];
                            }
                            return current;
                        });
                    }
                    if (payload.eventType === 'UPDATE') {
                        setWatchlist(current => current.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item));
                    }
                    if (payload.eventType === 'DELETE') {
                        if (payload.old.id) {
                            setWatchlist(current => current.filter(item => item.id !== payload.old.id));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isOnline, isSyncing]);

    const contextValue = {
        user,
        watchlist,
        loading: appLoading,
        addItem,
        addMultipleItems,
        updateItem,
        deleteItem,
        deleteMultipleItems,
        editingItem,
        setEditingItem,
        geminiItem,
        setGeminiItem,
        highlightedIds,
        setHighlightedIds,
        showToast,
        setConfirmation,
        setScrollToId,
        scrollToId,
        view,
        setView,
        initialListFilter,
        setInitialListFilter,
        initialSearch,
        setInitialSearch,
        toast,
        confirmation,
        isAiChatOpen,
        setIsAiChatOpen,
        isOnline,
        isSyncing,
        pendingSyncIds,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};
