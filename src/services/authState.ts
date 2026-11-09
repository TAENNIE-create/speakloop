// Tracks the currently signed-in Supabase user id outside of React state,
// so plain service functions (storage.ts) can decide whether to mirror
// writes to the cloud without needing to thread the user id through every call.
let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}
