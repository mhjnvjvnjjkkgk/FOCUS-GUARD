import { create } from 'zustand';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/configs/firebaseConfig';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
    initializeListener: () => () => void; // Returns unsubscribe
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    logout: async () => {
        try {
            await signOut(auth);
            set({ user: null });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    },
    initializeListener: () => {
        set({ isLoading: true });
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth State Changed:', user ? user.uid : 'No user');
            set({ user, isLoading: false });
        });
        return unsubscribe;
    },
}));
