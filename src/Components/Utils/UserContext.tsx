import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import {
    accessRemainingMs, ensureSession, getAuthState, restoreAuth, setAuth,
    signOutLocal, subscribeAuth, User,
} from "../../API/auth";

type UserContextType = {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    authReady: boolean;
    authError: string | null;
    sessionExpired: boolean;
    checkingAuth: boolean;
    retryAuth: () => void;
    setAuth: typeof setAuth;
    signOutLocal: typeof signOutLocal;
};

const UserContext = createContext<UserContextType | undefined>(undefined);
const checkAuth = () => { void restoreAuth().then(() => ensureSession()).catch(() => {}); };

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const state = useSyncExternalStore(subscribeAuth, getAuthState);
    const [authReady, setAuthReady] = useState(false);
    const { session } = state;
    const accessToken = session?.accessToken;

    useEffect(() => {
        checkAuth();
        const onVisible = () => { if (document.visibilityState === "visible") checkAuth(); };
        window.addEventListener("focus", onVisible);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.removeEventListener("focus", onVisible);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    useEffect(() => {
        if (getAuthState().status === "ready") setAuthReady(true);
    }, [state]);

    useEffect(() => {
        if (!accessToken) return;
        const timer = window.setTimeout(() => {
            if (document.visibilityState !== "hidden") checkAuth();
        }, Math.max(0, accessRemainingMs(accessToken)));
        return () => window.clearTimeout(timer);
    }, [accessToken]);

    return (
        <UserContext.Provider value={{
            user: session?.user ?? null,
            accessToken: session?.accessToken ?? null,
            refreshToken: session?.refreshToken ?? null,
            authReady,
            authError: state.error,
            sessionExpired: state.expired,
            checkingAuth: state.status === "checking",
            retryAuth: checkAuth,
            setAuth,
            signOutLocal,
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
};
