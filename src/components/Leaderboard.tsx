'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  personalBest: number;
  totalAttempts: number;
  displayName?: string;
};

function formatTime(time: number) {
    if (typeof time !== 'number' || time < 0) {
        return 'N/A';
    }
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const milliseconds = time % 1000;

    let timeString = '';
    if (minutes > 0) {
        timeString += `${minutes}m `;
    }
    timeString += `${seconds}s `;
    timeString += `${String(milliseconds).padStart(3, '0')}ms`;
    return timeString.trim();
}

export function Leaderboard() {
  const db = useFirestore();

  const leaderboardQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      orderBy('personalBest', 'desc'),
      limit(10)
    );
  }, [db]);

  const { data: leaderboard, loading } = useCollection<UserProfile>(leaderboardQuery);

  if (loading && !leaderboard) {
    return (
      <div className="w-full max-w-lg mx-auto mt-12">
        <h2 className="text-3xl font-headline font-bold text-center mb-4">Leaderboard</h2>
        <Card>
            <CardContent className="p-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-12 animate-fade-in">
      <h2 className="text-3xl font-headline font-bold text-center mb-4">Top 10 Survivors</h2>
      <Card>
          <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px] text-center">Rank</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Player</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {leaderboard && leaderboard.map((user, index) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell className="font-mono">{formatTime(user.personalBest)}</TableCell>
                    <TableCell className="text-right font-mono">{user.displayName || (user.id ? `...${user.id.slice(-6)}` : '...')}</TableCell>
                    </TableRow>
                ))}
                {(!leaderboard || leaderboard.length === 0) && !loading && (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            No scores yet. Be the first!
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}
