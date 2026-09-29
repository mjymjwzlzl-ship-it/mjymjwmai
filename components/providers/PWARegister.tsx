"use client";
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const swUrl = '/sw.js';
      navigator.serviceWorker.register(swUrl).catch(() => {});
    }
  }, []);
  return null;
}


