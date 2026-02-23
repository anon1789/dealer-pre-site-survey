import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResponseValue } from './surveyStore';

export interface OfflineRecord {
    id: string; // uuid or timestamp
    dealer_id: string;
    dealer_name?: string; // Cache the name if possible. Let's retrieve from URL or passed props if we can, else just ID.
    type: 'draft' | 'submit';
    responses: Record<string, Record<string, { response_value?: ResponseValue, comments?: string, photo_uri?: string }>>;
    overall_score: number;
    recommendation: string;
    timestamp: number;
}

interface OfflineState {
    queue: OfflineRecord[];
    addRecord: (record: OfflineRecord) => void;
    removeRecord: (id: string) => void;
    clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>()(
    persist(
        (set) => ({
            queue: [],
            addRecord: (record) => set((state) => {
                // If there's already a record for this dealer, replace it with the new one 
                // (e.g., upgrading draft -> submit, or newer draft)
                const existingIndex = state.queue.findIndex(q => q.dealer_id === record.dealer_id);
                if (existingIndex !== -1) {
                    const newQueue = [...state.queue];
                    newQueue[existingIndex] = record;
                    return { queue: newQueue };
                }
                return { queue: [...state.queue, record] };
            }),
            removeRecord: (id) => set((state) => ({ queue: state.queue.filter(q => q.id !== id) })),
            clearQueue: () => set({ queue: [] }),
        }),
        {
            name: 'offline-survey-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
