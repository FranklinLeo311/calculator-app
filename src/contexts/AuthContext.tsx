import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { secureStorage } from '../utils/secureStorage';
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

    useEffect(() => {
        (async () => {
            try {
                const raw = await secureStorage.getItem(USER_STORE_KEY);
                if (raw) {
                    const saved: FirebaseUser = JSON.parse(raw);
                    if (saved.refreshToken) {
                        try {
                            const { idToken, refreshToken } = await refreshIdToken(saved.refreshToken);
                            saved.idToken = idToken;
                            saved.refreshToken = refreshToken;
                            await secureStorage.setItem(USER_STORE_KEY, JSON.stringify(saved));
                        } catch {}
                    }
                    setUser(saved);
                }
            } catch {}
            setIsLoading(false);
        })();
    }, []);

    const signIn = useCallback(async (newUser: FirebaseUser) => {
        setUser(newUser);
        await secureStorage.setItem(USER_STORE_KEY, JSON.stringify(newUser));
        saveUserToDb(newUser).catch(() => {});
    }, []);

    const signOut = useCallback(async () => {
        setUser(null);
        await secureStorage.deleteItem(USER_STORE_KEY);
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
