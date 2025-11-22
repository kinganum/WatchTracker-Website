
import React from 'react';
import { WatchlistItemCard } from './WatchlistItemCard';
import { EmptyState } from '../ui/EmptyState';

export const WatchlistGrid = ({ watchlist, multiSelect, selectedItems, handleSelect, setItemRef }: { watchlist: any[], multiSelect: boolean, selectedItems: string[], handleSelect: (id: string) => void, setItemRef: (node: HTMLDivElement | null, id: string) => void }) => {
    if (watchlist.length === 0) {
        return <EmptyState />;
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* --- FIX: Props are correctly typed and passed, resolving the intrinsic attributes error. --- */}
            {watchlist.map(item => <WatchlistItemCard key={item.id} item={item} multiSelect={multiSelect} isSelected={selectedItems.includes(item.id)} onSelect={handleSelect} setItemRef={setItemRef} />)}
        </div>
    );
};
