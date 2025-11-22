import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { HomePage } from './pages/HomePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { UpdatesPage } from './pages/UpdatesPage';
import { AuthPage } from './components/auth/AuthPage';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { EditItemModal } from './components/modals/EditItemModal';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { GeminiModal } from './components/modals/GeminiModal';
import { Icon } from './components/Icons';
import { AiChatButton } from './components/chat/AiChatButton';
import { AiChatModal } from './components/chat/AiChatModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// This component renders the main application content for a logged-in user.
const AppContent = () => {
    const { user, editingItem, geminiItem, view, initialSearch, setInitialSearch, isOnline, isSyncing, isAiChatOpen, setIsAiChatOpen } = useAppContext();

    if (!user) {
        // This should not be reached if the outer component handles the session correctly, but as a fallback.
        return <AuthPage />;
    }

    return (
        <div className="min-h-screen bg-secondary/50 font-sans flex flex-col">
            <Header currentView={view} />
            
            {isSyncing && (
                <div role="status" className="w-full text-center p-2 text-white font-semibold bg-blue-500 animate-slide-up">
                    <div className="flex items-center justify-center">
                       <Icon name="loader" className="h-5 w-5 mr-2" />
                       Syncing offline changes...
                    </div>
                </div>
            )}
            {!isOnline && !isSyncing && (
                <div role="status" className="w-full text-center p-2 text-black font-semibold bg-yellow-400 animate-slide-up flex justify-center items-center gap-2">
                    <Icon name="cloud" className="h-5 w-5" />
                    You are currently offline. Changes are saved locally.
                </div>
            )}
            
            <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <ErrorBoundary>
                    {view === 'home' && <HomePage />}
                    {view === 'watchlist' && <WatchlistPage initialSearch={initialSearch} setInitialSearch={setInitialSearch} />}
                    {view === 'updates' && <UpdatesPage />}
                </ErrorBoundary>
            </main>
            {editingItem && <EditItemModal />}
            {geminiItem && <GeminiModal />}
            <AiChatButton />
            <AiChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />
            <Footer currentView={view} />
        </div>
    );
};

// This new component handles the main layout and renders global elements like toasts.
const AppLayout = () => {
    const { user, toast, confirmation, setConfirmation } = useAppContext();
    
    return (
        <>
            {!user ? <AuthPage /> : <AppContent />}

            {toast && (
                <div role="status" aria-live="polite" className={`fixed bottom-5 right-5 left-5 sm:left-auto p-4 rounded-lg shadow-lg text-white text-center sm:text-left z-50 animate-slide-up ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
            {confirmation && (
                <ConfirmationModal 
                    title={confirmation.title}
                    message={confirmation.message}
                    onConfirm={confirmation.onConfirm}
                    onClose={() => setConfirmation(null)}
                />
            )}
        </>
    );
};


// The main App component now handles session and provides the context.
export default function App() {
    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Icon name="loader" className="h-12 w-12 text-primary" />
            </div>
        );
    }
    
    return (
        <ErrorBoundary>
            <AppProvider user={user}>
                <AppLayout />
            </AppProvider>
        </ErrorBoundary>
    );
}