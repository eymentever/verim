import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export type QueuedAction =
  | { type: 'ADD_LOG'; payload: object; timestamp: string }
  | { type: 'SYNC_TARIFF'; payload: { city: string }; timestamp: string };

const QUEUE_KEY = 'verim_offline_queue';

export async function enqueue(action: QueuedAction): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedAction[] = raw ? JSON.parse(raw) : [];
  queue.push(action);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Online gelince kuyruktaki işlemleri sunucuya gönderir.
 * (API endpoint hazır olduğunda burada işlenir)
 */
export async function flushQueue(
  onAction: (action: QueuedAction) => Promise<void>
): Promise<{ flushed: number; failed: number }> {
  if (!(await isOnline())) return { flushed: 0, failed: 0 };

  const queue = await getQueue();
  let flushed = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      await onAction(action);
      flushed++;
    } catch {
      failed++;
      remaining.push(action);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { flushed, failed };
}
