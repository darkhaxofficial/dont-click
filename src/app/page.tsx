"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { type User, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, collection, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { Leaderboard } from '@/components/Leaderboard';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

const tensionMessages = [
  "Are you sure you understand what's at stake?",
  "Is this really worth it?",
  "Any second now...",
  "You're being watched.",
  "They know.",
  "How much longer can you resist?",
  "It's inevitable.",
  "What are you waiting for?",
  "Just a little longer.",
  "The silence is deafening, isn't it?",
  "Patience is a virtue... or is it a trap?",
  "What do you think happens when you click?",
  "Curiosity is a powerful thing.",
];

export default function Home() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<{ id: number; text: string } | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [userProfileLoaded, setUserProfileLoaded] = useState(false);

  // Distraction states
  const [mainTextStyle, setMainTextStyle] = useState<React.CSSProperties>({});
  const [cursorStyle, setCursorStyle] = useState('default');
  const [fakeAlert, setFakeAlert] = useState<{ active: boolean; content: React.ReactNode } | null>(null);
  const [mainText, setMainText] = useState("DON’T CLICK");
  const distractionTimeouts = useRef<NodeJS.Timeout[]>([]);


  // Game setup: Anonymous auth and start timer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (!startTime && !isGameOver) {
          setStartTime(Date.now());
        }
        if (db) {
            const userRef = doc(db, 'users', currentUser.uid);
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().displayName) {
                    setUserDisplayName(userSnap.data().displayName);
                }
            } catch (e) {
                console.error("Error fetching user profile:", e);
            } finally {
                setUserProfileLoaded(true);
            }
        }
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db, isGameOver, startTime]);

  // Tension message logic
  useEffect(() => {
    if (!startTime || isGameOver) return;

    let messageTimeoutId: NodeJS.Timeout;

    const displayMessage = () => {
      const message = tensionMessages[Math.floor(Math.random() * tensionMessages.length)];
      
      setCurrentMessage({ id: Date.now(), text: message });
      setIsMessageVisible(true);

      setTimeout(() => {
        setIsMessageVisible(false);
      }, 4000); // Message visible for 4 seconds

      const randomInterval = Math.random() * (12000 - 5000) + 5000;
      messageTimeoutId = setTimeout(displayMessage, randomInterval);
    };
    
    // Initial delay before first message
    const initialDelay = Math.random() * (12000 - 5000) + 5000;
    messageTimeoutId = setTimeout(displayMessage, initialDelay);

    return () => clearTimeout(messageTimeoutId);
  }, [startTime, isGameOver]);


  // --- DISTRACTION LOGIC ---

  const clearAllDistractions = useCallback(() => {
    distractionTimeouts.current.forEach(clearTimeout);
    distractionTimeouts.current = [];
    setMainTextStyle({});
    setCursorStyle('default');
    setFakeAlert(null);
    setMainText("DON’T CLICK");
  }, []);

  useEffect(() => {
    if (!startTime || isGameOver) {
        clearAllDistractions();
        return;
    }

    const addTimeout = (id: NodeJS.Timeout) => {
        distractionTimeouts.current.push(id);
    };

    const triggerTextJitter = () => {
        const x = (Math.random() - 0.5) * 4;
        const y = (Math.random() - 0.5) * 4;
        const rot = (Math.random() - 0.5) * 0.5;
        const opacity = 1 - Math.random() * 0.1;
        setMainTextStyle({
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
            opacity: opacity,
            transition: 'transform 0.05s, opacity 0.05s',
        });
        addTimeout(setTimeout(() => setMainTextStyle({ transition: 'transform 0.2s, opacity 0.2s' }), 100));
    };

    const fakeToasts = [
        { title: "New Record!", description: "Player_734 just survived 3m 41s" },
        { 
            title: "You've been challenged!", 
            description: "Beat 2m 11s to win.",
            action: <ToastAction altText="Accept challenge">Accept</ToastAction>,
        },
        { title: "Daily Best Broken", description: "A new champion reigns at 5m 02s." },
        { variant: "destructive" as const, title: "Player Disconnected", description: "xX_Gamer_Xx gave up." },
    ];
    const triggerFakeToast = () => {
        const randomToast = fakeToasts[Math.floor(Math.random() * fakeToasts.length)];
        toast(randomToast);
    };
    
    const fakeAlerts = [
      { title: "System Warning", message: "Unstable connection detected. Click OK to re-sync.", button: "OK" },
      { title: "Achievement Unlocked!", message: "Patience is a virtue. Claim your reward.", button: "Claim" },
      { title: "Memory Warning", message: "Browser memory is low. Please close unused tabs.", button: "Dismiss" },
    ];
    const triggerFakeAlert = () => {
      const alertContent = fakeAlerts[Math.floor(Math.random() * fakeAlerts.length)];
      setFakeAlert({
          active: true,
          content: (
              <div className="bg-card border border-destructive text-card-foreground p-4 rounded-lg shadow-2xl w-80 animate-fade-in">
                  <h3 className="font-headline font-bold text-lg mb-2">{alertContent.title}</h3>
                  <p className="text-sm mb-4">{alertContent.message}</p>
                  <div className="flex justify-end">
                      <Button variant="destructive" size="sm">{alertContent.button}</Button>
                  </div>
              </div>
          )
      });
      addTimeout(setTimeout(() => setFakeAlert(null), 2500 + Math.random() * 2000));
    };

    const cursorTypes = ['wait', 'progress', 'help', 'not-allowed', 'move'];
    const triggerCursorChange = () => {
        const cursor = cursorTypes[Math.floor(Math.random() * cursorTypes.length)];
        setCursorStyle(cursor);
        addTimeout(setTimeout(() => setCursorStyle('default'), 1000 + Math.random() * 1500));
    };

    const deceptiveTexts = ["CLICK NOW", "YOU WON", "CLAIM PRIZE", "FINISH HIM"];
    const triggerDeceptiveText = () => {
        const text = deceptiveTexts[Math.floor(Math.random() * deceptiveTexts.length)];
        setMainText(text);
        addTimeout(setTimeout(() => setMainText("DON’T CLICK"), 750));
    };

    let lastJitter = 0, lastToast = 0, lastCursor = 0, lastAlert = 0, lastDeceptive = 0;
    let animationFrameId: number;

    const distractionLoop = () => {
        const now = Date.now();
        const elapsed = now - startTime;

        // Stage 1: Jitter (from 5s)
        if (elapsed > 5000 && now - lastJitter > (3000 + Math.random() * 5000)) {
            triggerTextJitter();
            lastJitter = now;
        }

        // Stage 2: Toasts (from 30s)
        if (elapsed > 30000 && now - lastToast > (12000 + Math.random() * 10000)) {
            triggerFakeToast();
            lastToast = now;
        }
        
        // Stage 3: Aggressive (from 60s)
        if (elapsed > 60000) {
              if (now - lastCursor > (10000 + Math.random() * 15000)) {
                triggerCursorChange();
                lastCursor = now;
            }
        }

        // Stage 4: More Aggressive (from 90s)
        if (elapsed > 90000) {
            if (now - lastAlert > (25000 + Math.random() * 20000)) {
                triggerFakeAlert();
                lastAlert = now;
            }
        }
        
        // Stage 5: Deception (from 120s)
        if (elapsed > 120000) {
            if (now - lastDeceptive > (30000 + Math.random() * 30000)) {
                triggerDeceptiveText();
                lastDeceptive = now;
            }
        }

        animationFrameId = requestAnimationFrame(distractionLoop);
    };

    animationFrameId = requestAnimationFrame(distractionLoop);
    
    return () => {
        cancelAnimationFrame(animationFrameId);
        clearAllDistractions();
    }

  }, [startTime, isGameOver, toast, clearAllDistractions]);


  // Game over logic
  const handleGameOver = useCallback(async () => {
    if (isGameOver || !startTime || !user || !db) return;

    setIsGameOver(true);
    const endTime = Date.now();
    const duration = endTime - startTime;
    setSurvivalTime(duration);

    // Persist data to Firestore
    const todayStr = new Date().toISOString().split('T')[0];
    runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', user.uid);
      const globalStatsRef = doc(db, 'globalStats', 'stats');
      const sessionRef = doc(collection(db, 'sessions'));

      const userDoc = await transaction.get(userRef);
      const globalDoc = await transaction.get(globalStatsRef);
      
      const userData = userDoc.data() || { personalBest: 0, totalAttempts: 0 };
      const globalData = globalDoc.data() || { totalPlays: 0, dailyBest: 0, dailyBestDate: '' };
      
      // Update user stats
      const newPersonalBest = Math.max(userData.personalBest, duration);
      transaction.set(userRef, {
        personalBest: newPersonalBest,
        totalAttempts: (userData.totalAttempts || 0) + 1,
        lastPlayed: serverTimestamp(),
      }, { merge: true });

      // Update global stats
      let newDailyBest = duration;
      if (globalData.dailyBestDate === todayStr) {
        newDailyBest = Math.max(globalData.dailyBest, duration);
      }
      transaction.set(globalStatsRef, {
        totalPlays: (globalData.totalPlays || 0) + 1,
        dailyBest: newDailyBest,
        dailyBestDate: todayStr,
        lastUpdate: serverTimestamp(),
      }, { merge: true });
      
      // Log session
      transaction.set(sessionRef, {
        userId: user.uid,
        startTime,
        endTime,
        duration,
        createdAt: serverTimestamp(),
      });
    }).catch((serverError) => {
      // Emit a contextual error for debugging
      const permissionError = new FirestorePermissionError({
        path: 'N/A (Transaction)',
        operation: 'transaction',
        requestResourceData: { 
          note: 'Data for transaction not logged for brevity',
          userId: user.uid,
          duration,
          },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    
    // UI Effects
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

  }, [startTime, user, isGameOver, db]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !playerName.trim()) return;

    setIsSubmittingName(true);
    const userRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(userRef, { displayName: playerName.trim() });
        setUserDisplayName(playerName.trim());
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: { displayName: playerName.trim() },
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmittingName(false);
    }
  };

  // Click listener
  useEffect(() => {
    if (isGameOver || !startTime) return;
    window.addEventListener('click', handleGameOver);
    return () => {
      window.removeEventListener('click', handleGameOver);
    };
  }, [handleGameOver, isGameOver, startTime]);

  return (
    <main style={{ cursor: cursorStyle }} className={`flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 md:p-12 bg-background text-foreground transition-colors duration-100 ${showFlash ? 'bg-accent' : ''}`}>
      <div className="flex-grow flex items-center justify-center w-full">
        {isGameOver ? (() => {
          const minutes = Math.floor(survivalTime / 60000);
          const seconds = Math.floor((survivalTime % 60000) / 1000);
          const milliseconds = survivalTime % 1000;
          return (
              <div className="text-center animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-headline font-black mb-4">YOU CLICKED</h1>
              <p className="text-xl md:text-3xl font-body">You survived for</p>
              <div className="flex items-baseline justify-center my-4 text-5xl md:text-8xl font-headline font-black">
                  {minutes > 0 && (
                  <>
                      <span>{minutes}</span>
                      <span className="text-2xl md:text-4xl font-body font-normal mx-2">m</span>
                  </>
                  )}
                  <span>{minutes > 0 ? String(seconds).padStart(2, '0') : seconds}</span>
                  <span className="text-2xl md:text-4xl font-body font-normal mx-2">s</span>
                  <span>{String(milliseconds).padStart(3, '0')}</span>
                  <span className="text-2xl md:text-4xl font-body font-normal mx-2">ms</span>
              </div>
              <Button onClick={() => window.location.reload()} className="mt-8" size="lg">
                  Try Again
              </Button>

              {userProfileLoaded && !userDisplayName && (
                  <form onSubmit={handleNameSubmit} className="mt-6 flex w-full max-w-xs mx-auto items-center space-x-2">
                    <Input 
                      type="text" 
                      placeholder="Enter name for leaderboard"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      disabled={isSubmittingName}
                      maxLength={25}
                    />
                    <Button type="submit" disabled={isSubmittingName || !playerName.trim()}>
                      {isSubmittingName ? 'Saving...' : 'Add Name'}
                    </Button>
                  </form>
                )}

              </div>
          );
        })() : (
          <div className="relative flex flex-col items-center justify-center text-center">
             {startTime === null ? (
               <h1 className="text-6xl md:text-9xl font-headline font-black tracking-widest animate-pulse">
                  LOADING...
               </h1>
             ) : (
              <h1 style={mainTextStyle} className="text-6xl md:text-9xl font-headline font-black tracking-widest">
                {mainText}
              </h1>
             )}
            <div className="absolute top-full mt-8 h-16 w-screen max-w-lg px-4">
              <p className={`text-xl md:text-2xl font-body text-muted-foreground transition-opacity duration-1000 ${isMessageVisible ? 'opacity-100' : 'opacity-0'}`}>
                {currentMessage?.text}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fake Alert Overlay */}
      {fakeAlert?.active && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              {fakeAlert.content}
          </div>
      )}

      {isGameOver && <Leaderboard />}
    </main>
  );
}
