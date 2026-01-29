'use client';

import React, { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handler = (error: any) => {
      // Throwing the error here will cause it to be picked up by
      // Next.js's development error overlay.
      throw error;
    };

    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, []);

  return null;
}
