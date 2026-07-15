"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_GAP_MS = 2500;

export function useSubmitCooldown(gapMs = DEFAULT_GAP_MS) {
  const lastAt = useRef(0);
  const [blockedSec, setBlockedSec] = useState(0);

  const tryRun = useCallback(
    (run: () => void): boolean => {
      const now = Date.now();
      const elapsed = now - lastAt.current;
      if (elapsed < gapMs) {
        setBlockedSec(Math.ceil((gapMs - elapsed) / 1000));
        return false;
      }
      lastAt.current = now;
      setBlockedSec(0);
      run();
      return true;
    },
    [gapMs],
  );

  return { tryRun, blockedSec };
}
