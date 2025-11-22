
import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

const FooterLink = ({ children, onClick, 'aria-label': ariaLabel }: { children?: React.ReactNode, onClick: () => void, 'aria-label': string }) => (
    <button onClick={onClick} aria-label={ariaLabel} className="text-muted-foreground hover:text-foreground transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring rounded-sm p-0.5 -m-0.5">
        {children}
    </button>
);

export const Footer = ({ currentView }: { currentView: string }) => {
    const { setView, setInitialListFilter } = useAppContext();

    const handleNav = (target: string) => {
        if (target === 'home') {
            setView('home');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target === 'watchlist') {
            setView('watchlist');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target === 'updates') {
            setView('updates');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target === 'add-items') {
            setView('home');
            requestAnimationFrame(() => {
                document.getElementById('add-items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        } else if (target === 'favorites') {
            setInitialListFilter('favorites');
            setView('watchlist');
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    };
    
    return (
        <footer className="bg-background border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Left: Branding */}
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-foreground">WatchTracker</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">Your personal hub for tracking anime, movies, and series.</p>
                        <p className="text-xs text-muted-foreground mt-4">&copy; {new Date().getFullYear()} WatchTracker. All rights reserved.</p>
                    </div>
                    
                    {/* Center: Navigation */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground mb-3">Navigation</h4>
                        <ul className="space-y-2 text-sm flex flex-col">
                            <li>
                                <FooterLink onClick={() => handleNav('home')} aria-label="Navigate to Home page">
                                    Home
                                </FooterLink>
                            </li>
                            <li>
                                <FooterLink onClick={() => handleNav('watchlist')} aria-label="Navigate to Watchlist page">
                                    Watchlist
                                </FooterLink>
                            </li>
                            <li>
                                <FooterLink onClick={() => handleNav('updates')} aria-label="Navigate to Updates page">
                                    Updates
                                </FooterLink>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground mb-3">Actions</h4>
                        <ul className="space-y-2 text-sm flex flex-col">
                            <li>
                                <FooterLink onClick={() => handleNav('add-items')} aria-label="Navigate to Add Items section">
                                    Add Items
                                </FooterLink>
                            </li>
                            <li>
                                <FooterLink onClick={() => handleNav('favorites')} aria-label="Navigate to filtered Favorites view">
                                    Favorites
                                </FooterLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};
