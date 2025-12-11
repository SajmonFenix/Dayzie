import React, { useState, useEffect, useCallback } from 'react';
import { fetchDailyInspiration } from './services/geminiService';
import { InspirationData, LoadingState } from './types';
import { Card } from './components/Card';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Sparkles, Quote, Brain, Zap, RefreshCw, AlertCircle, Bell, BellRing, Share2, Check } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<InspirationData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  // Constants for LocalStorage keys
  const STORAGE_LAST_VISIT = 'daily_zen_last_visit';
  const STORAGE_LAST_NOTIFIED = 'daily_zen_last_notified';

  const loadInspiration = useCallback(async () => {
    setLoadingState(LoadingState.LOADING);
    setError(null);
    setCopied(false);
    try {
      const result = await fetchDailyInspiration();
      setData(result);
      setLoadingState(LoadingState.SUCCESS);
      
      const today = new Date().toDateString();
      localStorage.setItem(STORAGE_LAST_VISIT, today);
    } catch (err) {
      setError("Nepodarilo sa pripojiť k zdroju inšpirácie. Skontrolujte svoj API kľúč alebo to skúste znova.");
      setLoadingState(LoadingState.ERROR);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadInspiration();
    
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    if (!data) return;

    const textToShare = `✨ Denný Zen:\n\n"${data.motto}"\n\n💭 ${data.thought}\n\n🚀 ${data.motivation}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Môj Denný Zen',
          text: textToShare,
        });
      } catch (err) {
        // Share cancelled or failed, fallback to copy
        copyToClipboard(textToShare);
      }
    } else {
      copyToClipboard(textToShare);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Notification Logic
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Váš prehliadač nepodporuje notifikácie.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      new Notification("Denný Zen", {
        body: "Upozornenia boli zapnuté. Pripomenieme sa vám každé ráno.",
      });
    }
  };

  useEffect(() => {
    const checkAndNotify = () => {
      if (Notification.permission !== "granted") return;

      const today = new Date().toDateString();
      const now = new Date();
      const currentHour = now.getHours();
      
      const lastVisit = localStorage.getItem(STORAGE_LAST_VISIT);
      const lastNotified = localStorage.getItem(STORAGE_LAST_NOTIFIED);

      const isMorning = currentHour >= 8; 
      const visitedToday = lastVisit === today;
      const notifiedToday = lastNotified === today;

      if (isMorning && !visitedToday && !notifiedToday) {
        new Notification("Váš Denný Zen čaká", {
          body: "Nájdite si chvíľku pre seba a prečítajte si dnešnú inšpiráciu.",
          icon: "/favicon.ico"
        });
        localStorage.setItem(STORAGE_LAST_NOTIFIED, today);
      }
    };

    const intervalId = setInterval(checkAndNotify, 60000);
    checkAndNotify();
    return () => clearInterval(intervalId);
  }, [notificationsEnabled]);

  const currentDate = new Date().toLocaleDateString('sk-SK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      <header className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto relative">
        <div className="absolute top-6 right-6 md:top-10 md:right-10">
           <button
            onClick={requestNotificationPermission}
            disabled={notificationsEnabled}
            className={`p-2 rounded-full transition-all duration-300 ${
              notificationsEnabled 
                ? 'bg-indigo-50 text-indigo-400 cursor-default' 
                : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-100'
            }`}
            title={notificationsEnabled ? "Upozornenia sú aktívne" : "Zapnúť denné pripomienky"}
          >
            {notificationsEnabled ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </button>
        </div>

        <div className="inline-flex items-center justify-center p-2 px-4 bg-white rounded-full shadow-sm border border-slate-100 mb-6 animate-fade-in-down">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{currentDate}</span>
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-medium text-slate-900 mb-4 tracking-tight">
          Denný <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Zen</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
          Zastavte sa a nájdite rovnováhu s múdrosťou určenou priamo pre vás.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {loadingState === LoadingState.LOADING && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {loadingState === LoadingState.ERROR && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-red-900 font-semibold mb-2">Ups, niečo sa pokazilo</h3>
            <p className="text-red-600 mb-6 text-sm">{error}</p>
            <button 
              onClick={loadInspiration}
              className="px-6 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-full hover:bg-red-50 transition-colors shadow-sm"
            >
              Skúsiť znova
            </button>
          </div>
        )}

        {loadingState === LoadingState.SUCCESS && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
            
            {/* Motto - Full Width Feature */}
            <div className="md:col-span-2">
              <Card 
                title="Denné Motto" 
                icon={<Sparkles className="w-5 h-5" />}
                className="bg-gradient-to-br from-indigo-600 to-violet-700 border-none text-white shadow-xl shadow-indigo-200"
              >
                <div className="py-6 text-center relative">
                  <Quote className="w-8 h-8 text-white/30 mx-auto mb-4 rotate-180" />
                  <p className="font-serif text-3xl md:text-5xl font-medium leading-tight text-white mb-6">
                    "{data.motto}"
                  </p>
                  
                  {/* Share Icon - Bottom Right of the content container */}
                  <div className="absolute bottom-0 right-0 translate-y-2">
                    <button
                      onClick={handleShare}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"
                      title="Zdieľať myšlienku"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-300" /> : <Share2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Thought */}
            <Card 
              title="Myšlienka dňa" 
              icon={<Brain className="w-5 h-5" />}
              className="h-full"
              delay={100}
            >
              <div className="prose prose-slate prose-lg">
                <p className="font-serif text-xl text-slate-700 italic border-l-4 border-indigo-100 pl-4 py-1">
                  {data.thought}
                </p>
              </div>
            </Card>

            {/* Motivation */}
            <Card 
              title="Akčná motivácia" 
              icon={<Zap className="w-5 h-5" />}
              className="h-full bg-orange-50/50 border-orange-100"
              delay={200}
            >
              <p className="text-lg font-medium text-slate-800 mb-2">
                Dnešné zameranie:
              </p>
              <p className="text-slate-600 leading-relaxed">
                {data.motivation}
              </p>
            </Card>

          </div>
        )}

        {/* Action Bar */}
        <div className="mt-12 text-center pb-12">
          <button
            onClick={loadInspiration}
            disabled={loadingState === LoadingState.LOADING}
            className="group relative inline-flex items-center justify-center px-8 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-full shadow-sm hover:shadow-md hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${loadingState === LoadingState.LOADING ? 'animate-spin' : ''}`} />
            {loadingState === LoadingState.LOADING ? 'Premýšľam...' : 'Nová Inšpirácia'}
          </button>
        </div>

      </main>

      <footer className="text-center text-slate-400 text-sm py-8">
        <p>© {new Date().getFullYear()} Denný Zen • Poháňané Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;