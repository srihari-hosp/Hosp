import { useEffect, useState } from "react";

export const useDebounce = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
};
