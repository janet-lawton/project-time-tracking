import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;

let nextId = 0;

// Holds toast state for a single page. Success toasts remove themselves after
// AUTO_DISMISS_MS; error toasts stay until the user dismisses them. Only the
// most recent MAX_VISIBLE toasts are kept on screen.
function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      Object.values(activeTimers).forEach(clearTimeout);
    };
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(({ type, title, message }) => {
    const id = ++nextId;
    setToasts((current) => [...current, { id, type, title, message }].slice(-MAX_VISIBLE));

    if (type === 'success') {
      timers.current[id] = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    }
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}

export default useToast;
