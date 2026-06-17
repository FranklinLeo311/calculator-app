import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
    type FirebaseUser,
    saveUserToDb,
    refreshIdToken,
} from '../utils/firebaseAuth';

type AuthContextValue = {
    user: FirebaseUser | null;
    isAdmin: boolean;
    isLoading: boolean;
    signIn: (user: FirebaseUser) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAdmin: false,
    isLoading: true,
    signIn: async () => {},
    signOut: async () => {},
});

const USER_STORE_KEY = 'auth_user_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session on app start
    useEffect(() => {
        (async () => {
            try {
                const raw = await SecureStore.getItemAsync(USER_STORE_KEY);
                if (raw) {
                    const saved: FirebaseUser = JSON.parse(raw);
                    // Refresh token if we have one
                    if (saved.refreshToken) {
                        try {
                            const { idToken, refreshToken } = await refreshIdToken(saved.refreshToken);
                            saved.idToken = idToken;
                            saved.refreshToken = refreshToken;
                            await SecureStore.setItemAsync(USER_STORE_KEY, JSON.stringify(saved));
                        } catch {
                            // Token refresh failed — still restore user for offline use
                        }
                    }
                    setUser(saved);
                }
            } catch {}
            setIsLoading(false);
        })();
    }, []);

    const signIn = useCallback(async (newUser: FirebaseUser) => {
        setUser(newUser);
        await SecureStore.setItemAsync(USER_STORE_KEY, JSON.stringify(newUser));
        // Save to Firebase DB (fire and forget)
        saveUserToDb(newUser).catch(() => {});
    }, []);

    const signOut = useCallback(async () => {
        setUser(null);
        await SecureStore.deleteItemAsync(USER_STORE_KEY);
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isAdmin: user?.role === 'admin',
            isLoading,
            signIn,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
