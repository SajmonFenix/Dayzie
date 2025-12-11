import React, { useState, useEffect, useCallback } from 'react';
import { fetchDailyInspirationBatch } from './services/geminiService';
import { InspirationData, LoadingState } from './types';
import { Card } from './components/Card';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Sparkles, Quote, Brain, Zap, RefreshCw, AlertCircle, Bell, BellRing, Share2, Check, Lock, Download } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<InspirationData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Queue state - zásobník ďalších inšpirácií
  const [queue, setQueue] = useState<InspirationData[]>([]);

  // Constants for LocalStorage keys
  const STORAGE_LAST_VISIT = 'daily_zen_last_visit';
  const STORAGE_LAST_NOTIFIED = 'daily_zen_last_notified';
  const STORAGE_CURRENT_DATA = 'daily_zen_current_'; // Čo je práve zobrazené
  const STORAGE_QUEUE_DATA = 'daily_zen_queue_';     // Čo je v zásobníku

  // 1. Initial Load - Ráno alebo pri refreshi stránky
  const initializeDailyZen = useCallback(async () => {
    const todayDateString = new Date().toDateString();
    const currentDataKey = STORAGE_CURRENT_DATA + todayDateString;
    const queueDataKey = STORAGE_QUEUE_DATA + todayDateString;

    setLoadingState(LoadingState.LOADING);
    setError(null);

    try {
      // A. Skúsime načítať aktuálne zobrazené dáta
      const storedCurrent = localStorage.getItem(currentDataKey);
      const storedQueue = localStorage.getItem(queueDataKey);

      if (storedCurrent) {
        console.log("Obnovujem reláciu z cache...");
        setData(JSON.parse(storedCurrent));

        if (storedQueue) {
          setQueue(JSON.parse(storedQueue));
        } else {
          setQueue([]);
        }

        setLoadingState(LoadingState.SUCCESS);
        localStorage.setItem(STORAGE_LAST_VISIT, todayDateString);
        return;
      }

      // B. Ak nemáme dáta pre dnešok, stiahneme celý balík (1 request = 6 items)
      console.log("Sťahujem nový denný balík (Batch Request)...");
      const batchResult = await fetchDailyInspirationBatch();

      if (!batchResult || batchResult.length === 0) {
        throw new Error("Received empty data from AI");
      }

      // Rozdelíme: Prvý ide na obrazovku, zvyšok do zásoby
      const [firstInspiration, ...remainingInspirations] = batchResult;

      // Update State
      setData(firstInspiration);
      setQueue(remainingInspirations);
      setLoadingState(LoadingState.SUCCESS);

      // Update Storage
      localStorage.setItem(currentDataKey, JSON.stringify(firstInspiration));
      localStorage.setItem(queueDataKey, JSON.stringify(remainingInspirations));
      localStorage.setItem(STORAGE_LAST_VISIT, todayDateString);

    } catch (err: any) {
      console.error("App Error:", err);
      let errorMessage = "Nepodarilo sa pripojiť k zdroju inšpirácie. Skúste to prosím neskôr.";

      const errString = err?.toString() || "";
      const errMessage = err?.message || "";

      if (errString.includes("429") || errMessage.includes("429")) {
        errorMessage = "Server je momentálne vyťažený. Skúste to prosím neskôr.";
      } else if (errMessage.includes("API key")) {
        errorMessage = "Problém s API kľúčom.";
      }

      setError(errorMessage);
      setLoadingState(LoadingState.ERROR);
    }
  }, []);

  // 2. Handle "New Inspiration" click - Synchronous / Instant
  const handleNextInspiration = () => {
    if (queue.length === 0) return;

    const todayDateString = new Date().toDateString();
    const currentDataKey = STORAGE_CURRENT_DATA + todayDateString;
    const queueDataKey = STORAGE_QUEUE_DATA + todayDateString;

    // Vyberieme ďalší z fronty
    const nextInspiration = queue[0];
    const newQueue = queue.slice(1);

    // Update State (Okamžitá zmena UI)
    setLoadingState(LoadingState.LOADING); // Len pre efekt, trvá to milisekundy

    setTimeout(() => {
      setData(nextInspiration);
      setQueue(newQueue);
      setLoadingState(LoadingState.SUCCESS);

      // Update Storage
      localStorage.setItem(currentDataKey, JSON.stringify(nextInspiration));
      localStorage.setItem(queueDataKey, JSON.stringify(newQueue));
    }, 400); // Malé umelé oneskorenie pre lepší UX pocit (aby si užívateľ všimol zmenu)
  };

  useEffect(() => {
    initializeDailyZen();

    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    if (!data) return;
    const textToShare = `✨ Denný Zen:\n\n"${data.motto}"\n\n💭 ${data.thought}\n\n🚀 ${data.motivation}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Môj Denný Zen', text: textToShare });
      } catch (err) { copyToClipboard(textToShare); }
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

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) { alert("Váš prehliadač nepodporuje notifikácie."); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        new Notification("Denný Zen", { body: "Upozornenia boli zapnuté." });
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const checkAndNotify = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const today = new Date().toDateString();
      const now = new Date();
      if (now.getHours() >= 8 && localStorage.getItem(STORAGE_LAST_VISIT) !== today && localStorage.getItem(STORAGE_LAST_NOTIFIED) !== today) {
        new Notification("Váš Denný Zen čaká", { body: "Nájdite si chvíľku pre seba.", icon: "/favicon.ico" });
        localStorage.setItem(STORAGE_LAST_NOTIFIED, today);
      }
    };
    checkAndNotify();
  }, [notificationsEnabled]);

  const currentDate = new Date().toLocaleDateString('sk-SK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-20">

      <header className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto relative">
        <div className="absolute top-6 right-6 md:top-10 md:right-10 flex gap-2">
          {/* Install Button - Shows only if install is available */}
          {deferredPrompt && (
             <button
             onClick={handleInstallClick}
             className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all duration-300 animate-pulse"
             title="Nainštalovať aplikáciu"
           >
             <Download className="w-5 h-5" />
           </button>
          )}

           <button
            onClick={requestNotificationPermission}
            disabled={notificationsEnabled}
            className={`p-2 rounded-full transition-all duration-300 ${
              notificationsEnabled
                ? 'bg-indigo-50 text-indigo-400 cursor-default'
                : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-100'
            }`}
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

        {loadingState === LoadingState.LOADING && !data && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {loadingState === LoadingState.ERROR && (
          <div className="max-w-md mx-auto bg-white border border-red-100 rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-slate-900 font-serif text-xl font-medium mb-3">Chvíľka strpenia</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">{error}</p>
            <button
              onClick={() => initializeDailyZen()}
              className="px-8 py-3 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all shadow-lg"
            >
              Skúsiť znova
            </button>
          </div>
        )}

        {data && (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min transition-opacity duration-500 ${loadingState === LoadingState.LOADING ? 'opacity-50' : 'opacity-100'}`}>

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
                  <div className="absolute bottom-0 right-0 translate-y-2">
                    <button onClick={handleShare} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm">
                      {copied ? <Check className="w-5 h-5 text-green-300" /> : <Share2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            <Card title="Myšlienka dňa" icon={<Brain className="w-5 h-5" />} className="h-full" delay={100}>
              <div className="prose prose-slate prose-lg">
                <p className="font-serif text-xl text-slate-700 italic border-l-4 border-indigo-100 pl-4 py-1">
                  {data.thought}
                </p>
              </div>
            </Card>

            <Card title="Akčná motivácia" icon={<Zap className="w-5 h-5" />} className="h-full bg-orange-50/50 border-orange-100" delay={200}>
              <p className="text-lg font-medium text-slate-800 mb-2">Dnešné zameranie:</p>
              <p className="text-slate-600 leading-relaxed">{data.motivation}</p>
            </Card>

          </div>
        )}

        {loadingState !== LoadingState.ERROR && (
          <div className="mt-12 text-center pb-12 flex flex-col items-center">
            <button
              onClick={handleNextInspiration}
              disabled={loadingState === LoadingState.LOADING || queue.length === 0}
              className={`group relative inline-flex items-center justify-center px-8 py-3 font-medium rounded-full shadow-sm transition-all duration-200
                ${queue.length > 0
                  ? 'bg-white border border-slate-200 text-slate-700 hover:shadow-md hover:border-indigo-300 hover:text-indigo-600'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                } disabled:opacity-70`}
            >
              {queue.length > 0 ? (
                <RefreshCw className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${loadingState === LoadingState.LOADING ? 'animate-spin' : ''}`} />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}

              {loadingState === LoadingState.LOADING
                ? 'Premýšľam...'
                : queue.length > 0
                  ? 'Nová Inšpirácia'
                  : 'Limit dosiahnutý'}
            </button>

            <p className="mt-3 text-xs font-medium text-slate-400">
              {queue.length > 0
                ? `Zostávajúce inšpirácie v zásobe: ${queue.length}`
                : 'Dnešný limit inšpirácií bol vyčerpaný. Príďte opäť zajtra!'}
            </p>
          </div>
        )}

      </main>

      <footer className="text-center text-slate-400 text-sm py-8">
        <p>© {new Date().getFullYear()} Denný Zen • Poháňané Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;