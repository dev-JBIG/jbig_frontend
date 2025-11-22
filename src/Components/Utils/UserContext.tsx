import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = {
    username: string;
    semester: string;
    email: string;
    is_staff?: boolean;
} | null;

type UserContextType = {
    user: User;
    accessToken: string | null;
    refreshToken: string | null;
    authReady: boolean;
    setAuth: (u: User, accessToken?: string | null, refreshToken?: string | null) => void;
    signOutLocal: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// 프로필(유저), 토큰 키
const PROFILE_KEY = "jbig-profile";
const ACCESS_KEY  = "jbig-access";
const REFRESH_KEY = "jbig-refresh";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const bc = useMemo(() => new BroadcastChannel("jbig-auth"), []);

    useEffect(() => {
        try {
            const rawProfile = localStorage.getItem(PROFILE_KEY);
            if (rawProfile) setUser(JSON.parse(rawProfile));
            const rawAccess = localStorage.getItem(ACCESS_KEY);
            if (rawAccess) setAccessToken(rawAccess);
            const rawRefresh = localStorage.getItem(REFRESH_KEY);
            if (rawRefresh) setRefreshToken(rawRefresh);
        } finally {
            setAuthReady(true); // 복원 끝
        }
    }, []);

    // 탭 간 동기화
    useEffect(() => {
        bc.onmessage = (e) => {
            const { type, payload } = e.data || {};
            if (type === "SET_AUTH") {
                const nextUser: User = payload.user ?? null;
                const nextAccess: string | null = payload.accessToken ?? null;
                const nextRefresh: string | null = payload.refreshToken ?? null;

                setUser(nextUser);
                setAccessToken(nextAccess);
                setRefreshToken(nextRefresh);

                try {
                    if (nextUser) localStorage.setItem(PROFILE_KEY, JSON.stringify(nextUser));
                    else localStorage.removeItem(PROFILE_KEY);

                    if (nextAccess) localStorage.setItem(ACCESS_KEY, nextAccess);
                    else localStorage.removeItem(ACCESS_KEY);

                    if (nextRefresh) localStorage.setItem(REFRESH_KEY, nextRefresh);
                    else localStorage.removeItem(REFRESH_KEY);
                } catch {}
            }

            if (type === "SIGN_OUT") {
                setUser(null);
                setAccessToken(null);
                setRefreshToken(null);
                localStorage.removeItem(PROFILE_KEY);
                localStorage.removeItem(ACCESS_KEY);
                localStorage.removeItem(REFRESH_KEY);
            }
        };
    }, [bc]);

    const setAuth = (u: User, token?: string | null, refresh?: string | null) => {
        setUser(u);
        if (typeof token !== "undefined") setAccessToken(token);
        if (typeof refresh !== "undefined") setRefreshToken(refresh);

        try {
            if (u) localStorage.setItem(PROFILE_KEY, JSON.stringify(u));
            else localStorage.removeItem(PROFILE_KEY);

            if (typeof token !== "undefined") {
                if (token) localStorage.setItem(ACCESS_KEY, token);
                else localStorage.removeItem(ACCESS_KEY);
            }

            if (typeof refresh !== "undefined") {
                if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
                else localStorage.removeItem(REFRESH_KEY);
            }
        } catch {}

        bc.postMessage({
            type: "SET_AUTH",
            payload: { user: u, accessToken: token ?? null, refreshToken: refresh ?? null },
        });
    };

    const signOutLocal = () => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        bc.postMessage({ type: "SIGN_OUT" });
    };

    return (
        <UserContext.Provider value={{ user, accessToken, refreshToken, authReady, setAuth, signOutLocal }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
};
