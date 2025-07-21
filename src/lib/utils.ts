import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // TODO: Subscribe to push notifications (stub)
      // e.g., navigator.serviceWorker.ready.then(sw => sw.pushManager.subscribe(...))
    }
    return perm;
  }
  return 'unsupported';
}
