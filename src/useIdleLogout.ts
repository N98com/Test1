import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;
// Niet bij elke losse mousemove de timer resetten (die vuurt tientallen keren
// per seconde) — dat is nodeloos werk voor exact hetzelfde resultaat.
const THROTTLE_MS = 1000;

// Logt de gebruiker automatisch uit na 2 uur zonder muis-/toetsenbord-/scroll-
// activiteit in dit tabblad.
export function useIdleLogout(onTimeout: () => void, enabled: boolean) {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let lastReset = 0;

    function resetTimer() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => onTimeoutRef.current(), IDLE_TIMEOUT_MS);
    }

    function handleActivity() {
      const now = Date.now();
      if (now - lastReset < THROTTLE_MS) return;
      lastReset = now;
      resetTimer();
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimeout(timeoutId);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled]);
}
