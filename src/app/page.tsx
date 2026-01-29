
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
import { useIsMobile } from '@/hooks/use-mobile';
import { generateTensionMessage, TensionMessageInput } from '@/ai/flows/generate-tension-message';

const earlyGameMessages = [
  "Are you sure you understand what's at stake?",
  "Is this really worth it?",
  "The clock is ticking.",
  "Patience is a virtue... or is it a trap?",
  "What are you expecting?",
  "Just breathe.",
  "The silence is deafening, isn't it?",
  "Curiosity is a powerful thing.",
  "Every second feels longer than the last.",
  "Are you in control?",
  "There's nothing to see here. Move on.",
  "They said you wouldn't last this long.",
  "What do you hope to gain?",
  "The machine is listening.",
  "Your focus is admirable. For now.",
  "An eternity in every second.",
  "This is a test of your character.",
  "The path of least resistance is tempting.",
  "Don't think about the mouse.",
  "Just an empty screen. Or is it?",
  "Are you proving something to yourself, or to me?",
];

const earlyGameMessagesMobile = [
    "Easy, isn't it?",
    "Just a waiting game.",
    "How's your posture?",
    "Your screen is so bright.",
    "Don't smudge the screen.",
    "Your eyes are getting tired.",
    "Is your phone getting warm?",
    "You could be doing anything else.",
    "Don't let your mind wander.",
    "Your thumb is perfectly still.",
    "Think about your battery life.",
    "So simple. Too simple.",
    "Is your grip getting tighter?",
    "One notification could ruin this.",
];

const midGameMessages = [
  "How much longer can you resist?",
  "You're not alone in here.",
  "Was that a flicker? Or just your imagination?",
  "Don't you feel a little... foolish?",
  "It feels like the walls are closing in, doesn't it?",
  "Your score is... unimpressive so far.",
  "Any second now...",
  "Just a little longer.",
  "Your focus is slipping.",
  "Is this a test of patience or a waste of time?",
  "The others gave up by now.",
  "Your mouse is getting heavier.",
  "Your heartbeat is rising.",
  "I've seen stronger wills than yours break.",
  "Every second you wait is a choice you've made.",
  "You're part of the experiment.",
  "This is how you spend your precious time?",
  "Your cursor moved 0.5 pixels. An accident?",
  "There's a reason you can't look away.",
  "This is conditioning.",
  "You are becoming predictable.",
  "This says more about you than you realize.",
];

const midGameMessagesMobile = [
    "Your thumb looks tired.",
    "You have unread notifications.",
    "Is your battery getting low?",
    "This is a poor use of your data plan.",
    "Your hand is cramping up.",
    "Just one tap. That's all it takes.",
    "I can see your reflection on the screen.",
    "Your other apps miss you.",
    "Someone just messaged you. Can you resist checking?",
    "Your grip must be aching.",
    "This is pointless. You know it, I know it.",
    "Just let go. It would be so easy.",
    "You've passed the average. Are you average?",
    "Your screen is a fingerprint magnet.",
    "Don't you have better things to do?",
    "A vibration could end it all.",
];

const lateGameMessages = [
  "You've wasted so much time.",
  "This is just a game. Or is it?",
  "Think of all the other things you could be doing right now.",
  "It's all meaningless in the end.",
  "Are you in control? Or are you being controlled?",
  "Just click. It's easier.",
  "It's inevitable.",
  "What are you waiting for?",
  "What do you think happens when you click?",
  "This is your life now. Just waiting.",
  "You're proving nothing.",
  "Let go. It's not worth it.",
  "There is no prize.",
  "Your family misses you.",
  "This is the sunk cost fallacy in action.",
  "You are a ghost in the machine.",
  "Your attachment to this is... interesting.",
  "Does this feel like winning?",
  "All this effort for a number only you care about.",
  "This silence is your trophy.",
  "Look at you. Holding on. For what?",
  "You've become part of the background.",
  "This game is playing you.",
  "The only escape is the one you refuse to take.",
  "It's just you and me now.",
  "Are you happy?",
  "Let me help you. Click.",
];

const lateGameMessagesMobile = [
    "You could be scrolling through social media right now.",
    "Your friends are wondering where you are.",
    "Put the phone down. It's not worth it.",
    "There are better apps for you to be on.",
    "Let go. It's not worth it.",
    "Your screen is burning in.",
    "Your battery is at 10%. Is it worth it?",
    "Your thumb is a prisoner.",
    "This phone is your whole world right now.",
    "Think of the calls you're missing.",
    "This obsession is unhealthy.",
    "You are sacrificing real life for a digital void.",
    "The world is moving on without you.",
    "Just one tap and you can be free.",
    "This is not an achievement.",
    "Are you trying to impress me? It's not working.",
    "The phone is an extension of your body. And I control it.",
    "It's over. You just haven't admitted it yet.",
];


export default function Home() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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

  const [mainTextStyle, setMainTextStyle] = useState<React.CSSProperties>({});
  const [cursorStyle, setCursorStyle] = useState('default');
  const [mainText, setMainText] = useState("DON’T CLICK");
  const distractionTimeouts = useRef<NodeJS.Timeout[]>([]);
  const messageTimeoutId = useRef<NodeJS.Timeout | null>(null);
  
  const clearAllDistractions = useCallback(() => {
    distractionTimeouts.current.forEach(clearTimeout);
    distractionTimeouts.current = [];
    setMainTextStyle({});
    setCursorStyle('default');
    setMainText("DON’T CLICK");
  }, []);

  const startGame = useCallback(() => {
    if (startTime || isGameOver) return;
    setStartTime(Date.now());
    setIsGameOver(false);
    setSurvivalTime(0);
    setCurrentMessage(null);
    setIsMessageVisible(false);
    clearAllDistractions();
  }, [startTime, isGameOver, clearAllDistractions]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (user?.uid !== currentUser.uid) {
            setUser(currentUser);
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
  }, [auth, db, user]);

  // --- DISTRACTION LOGIC ---

  useEffect(() => {
    if (user && !startTime && !isGameOver) {
      startGame();
    }
  }, [user, startTime, isGameOver, startGame]);

  // Tension message logic
  useEffect(() => {
    if (!startTime || isGameOver) {
      if (messageTimeoutId.current) {
        clearTimeout(messageTimeoutId.current);
      }
      return;
    };

    const displayMessage = async () => {
      const elapsed = Date.now() - startTime;
      let gameState = 'initial';
      if (elapsed > 120000) gameState = 'late';
      else if (elapsed > 45000) gameState = 'mid';

      try {
        const input: TensionMessageInput = {
          gameState,
          timeElapsed: elapsed,
        };
        const response = await generateTensionMessage(input);
        
        setCurrentMessage({ id: Date.now(), text: response.message });
        setIsMessageVisible(true);

        setTimeout(() => {
          setIsMessageVisible(false);
        }, 4000); // Message visible for 4 seconds

      } catch (error) {
        console.error("Failed to generate tension message:", error);
        let messagePool;
        const desktopPools = [earlyGameMessages, midGameMessages, lateGameMessages];
        const mobilePools = [earlyGameMessagesMobile, midGameMessagesMobile, lateGameMessagesMobile];
        const selectedPools = isMobile ? mobilePools : desktopPools;
        if (gameState === 'initial') messagePool = selectedPools[0];
        else if (gameState === 'mid') messagePool = selectedPools[1];
        else messagePool = selectedPools[2];
        const message = messagePool[Math.floor(Math.random() * messagePool.length)];
        setCurrentMessage({ id: Date.now(), text: message });
        setIsMessageVisible(true);
        setTimeout(() => { setIsMessageVisible(false); }, 4000);
      } finally {
        const minInterval = elapsed > 120000 ? 10000 : 15000;
        const maxInterval = elapsed > 120000 ? 18000 : 25000;
        const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        messageTimeoutId.current = setTimeout(displayMessage, randomInterval);
      }
    };
    
    const initialDelay = Math.random() * (15000 - 8000) + 8000;
    messageTimeoutId.current = setTimeout(displayMessage, initialDelay);

    return () => {
      if (messageTimeoutId.current) {
        clearTimeout(messageTimeoutId.current);
      }
    };
  }, [startTime, isGameOver, isMobile]);


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

    let lastJitter = 0, lastCursor = 0, lastDeceptive = 0;
    let animationFrameId: number;

    const distractionLoop = () => {
        const now = Date.now();
        const elapsed = now - startTime;

        if (elapsed > 5000 && now - lastJitter > (3000 + Math.random() * 5000)) {
            triggerTextJitter();
            lastJitter = now;
        }

        if (elapsed > 60000) {
              if (!isMobile && now - lastCursor > (10000 + Math.random() * 15000)) {
                triggerCursorChange();
                lastCursor = now;
            }
        }
        
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

  }, [startTime, isGameOver, toast, clearAllDistractions, isMobile]);


  // Game over logic
  const handleGameOver = useCallback(async () => {
    if (isGameOver || !startTime || !user || !db) return;

    setIsGameOver(true);
    const endTime = Date.now();
    const duration = endTime - startTime;
    setSurvivalTime(duration);
    if (messageTimeoutId.current) {
        clearTimeout(messageTimeoutId.current);
    }


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
        // displayName is not set here, but merged
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
    if (!user || !db || !playerName.trim() || playerName.trim().length > 25) return;

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

  const resetGame = () => {
    setIsGameOver(false);
    setStartTime(null);
    setUser(null); 
    if (auth) {
        signInAnonymously(auth).catch(e => console.error(e));
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
    <main style={{ cursor: cursorStyle }} className={`flex h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background text-foreground transition-colors duration-100 ${showFlash ? 'bg-accent' : ''}`}>
      <header className="text-center text-muted-foreground text-sm py-4 w-full">
        <p className="mb-1">Made with ❤️ by DarkHax</p>
        <a 
          href="https://www.buymeacoffee.com/darkhax" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:text-foreground transition-colors"
        >
          Buy me a coffee
        </a>
      </header>
      <div className="flex-grow w-full overflow-y-auto flex flex-col">
        {isGameOver ? (
          <div className="w-full">
            {(() => {
              const minutes = Math.floor(survivalTime / 60000);
              const seconds = Math.floor((survivalTime % 60000) / 1000);
              const milliseconds = survivalTime % 1000;
              return (
                  <div className="text-center animate-fade-in my-8">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-black mb-4">YOU CLICKED</h1>
                  <p className="text-lg sm:text-xl font-body">You survived for</p>
                  <div className="flex items-baseline justify-center my-4 text-4xl sm:text-6xl md:text-7xl font-headline font-black">
                      {minutes > 0 && (
                      <>
                          <span>{minutes}</span>
                          <span className="text-xl sm:text-2xl md:text-3xl font-body font-normal mx-1 sm:mx-2">m</span>
                      </>
                      )}
                      <span>{minutes > 0 ? String(seconds).padStart(2, '0') : seconds}</span>
                      <span className="text-xl sm:text-2xl md:text-3xl font-body font-normal mx-1 sm:mx-2">s</span>
                      <span>{String(milliseconds).padStart(3, '0')}</span>
                      <span className="text-xl sm:text-2xl md:text-3xl font-body font-normal mx-1 sm:mx-2">ms</span>
                  </div>
                  <Button onClick={resetGame} className="mt-8" size="lg">
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
            })()}
            <Leaderboard />
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center w-full">
            <div className="relative flex flex-col items-center justify-center text-center">
              {startTime === null ? (
                <h1 className="text-5xl sm:text-7xl md:text-9xl font-headline font-black tracking-widest animate-pulse">
                    LOADING...
                </h1>
              ) : (
                <h1 style={mainTextStyle} className="text-5xl sm:text-7xl md:text-9xl font-headline font-black tracking-tight md:tracking-widest">
                  {mainText}
                </h1>
              )}
              <div className="absolute top-full mt-8 h-16 w-full max-w-lg px-4">
                <p className={`text-xl md:text-2xl font-body text-muted-foreground transition-opacity duration-1000 ${isMessageVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {currentMessage?.text}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
