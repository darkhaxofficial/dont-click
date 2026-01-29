"use client";

import { useState, useEffect, useCallback } from 'react';
import { type User, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const [user, setUser] = useState<User | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<{ id: number; text: string } | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  // Game setup: Anonymous auth and start timer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (!startTime && !isGameOver) {
          setStartTime(Date.now());
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
  }, [auth, isGameOver, startTime]);

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
    setTimeout(() => window.location.reload(), 3000);

  }, [startTime, user, isGameOver, db]);

  // Click listener
  useEffect(() => {
    if (isGameOver || !startTime) return;
    window.addEventListener('click', handleGameOver);
    return () => {
      window.removeEventListener('click', handleGameOver);
    };
  }, [handleGameOver, isGameOver, startTime]);

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground transition-colors duration-100 ${showFlash ? 'bg-accent' : ''}`}>
      {isGameOver ? (
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-headline font-black mb-4">YOU CLICKED</h1>
          <p className="text-xl md:text-3xl font-body">You survived for</p>
          <p className="text-5xl md:text-8xl font-headline font-black my-4">
            {survivalTime}
            <span className="text-2xl md:text-4xl ml-2 font-body font-normal">ms</span>
          </p>
          <p className="text-lg md:text-xl font-body text-muted-foreground">A new attempt will begin shortly...</p>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center text-center">
           {startTime === null ? (
             <h1 className="text-6xl md:text-9xl font-headline font-black tracking-widest animate-pulse">
                LOADING...
             </h1>
           ) : (
            <h1 className="text-6xl md:text-9xl font-headline font-black tracking-widest">
              DON’T CLICK
            </h1>
           )}
          <div className="absolute top-full mt-8 h-16 w-screen max-w-lg px-4">
            <p className={`text-xl md:text-2xl font-body text-muted-foreground transition-opacity duration-1000 ${isMessageVisible ? 'opacity-100' : 'opacity-0'}`}>
              {currentMessage?.text}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
