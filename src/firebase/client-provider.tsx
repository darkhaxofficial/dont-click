'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const firebaseInstances = useMemo(() => initializeFirebase(), []);

  return <FirebaseProvider value={firebaseInstances}>{children}</FirebaseProvider>;
}
