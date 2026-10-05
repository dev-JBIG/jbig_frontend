import axios from "axios";

export type User = {
    username: string;
    semester: string;
    email: string;
    is_staff?: boolean;
};

export type Session = { id: string; user: User; accessToken: string; refreshToken: string };
type AuthRecord = { session: Session | null; expired: boolean };
type AuthState = AuthRecord & { status: "ready" | "checking" | "error"; error: string | null };

export const BASE_URL = process.env.REACT_APP_API_BASE_URL
    || (process.env.REACT_APP_SERVER_HOST && process.env.REACT_APP_SERVER_PORT
        ? `http://${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_SERVER_PORT}`
        : window.location.origin);
export const AUTH_TIMEOUT_MS = 15000;
export const SESSION_KEY = "jbig-session";
const LEGACY_KEYS = ["jbig-profile", "jbig-access", "jbig-refresh", "jbig-staff-auth"];
const emptyRecord: AuthRecord = { session: null, expired: false };
const listeners = new Set<() => void>();
let state: AuthState = { ...emptyRecord, status: "checking", error: null };
let pendingRefresh: Promise<Session | null> | null = null;

// 갱신 요청은 인증 인터셉터를 거치지 않는다.
export const authTransport = axios.create({ baseURL: BASE_URL, timeout: AUTH_TIMEOUT_MS });

async function withAuthLock<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (!navigator.locks) throw new Error("이 브라우저에서는 로그인 갱신을 지원하지 않습니다. 다시 로그인해주세요.");
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
    try {
        return await navigator.locks.request("jbig-auth-refresh", { signal: controller.signal }, () => action(controller.signal));
    } finally {
        window.clearTimeout(deadline);
    }
}

export function readAuth(): AuthRecord {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") || emptyRecord;
    } catch {
        return emptyRecord;
    }
}

function publish(record: AuthRecord, status: AuthState["status"] = "ready", error: string | null = null) {
    state = { ...record, status, error };
    listeners.forEach(listener => listener());
}

function save(record: AuthRecord, status: AuthState["status"] = "ready") {
    // 프로필과 두 토큰을 한 번에 저장해 다른 탭이 중간 상태를 읽지 않게 한다.
    localStorage.setItem(SESSION_KEY, JSON.stringify(record));
    publish(record, status);
}

export const getAuthState = () => state;
export const subscribeAuth = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

window.addEventListener("storage", event => {
    if (event.key === SESSION_KEY || event.key === null) publish(readAuth());
});

export async function restoreAuth() {
    publish(readAuth(), "checking");
    if (localStorage.getItem(SESSION_KEY) || !localStorage.getItem("jbig-profile")) return;
    try {
        await withAuthLock(async () => {
            if (localStorage.getItem(SESSION_KEY)) return;
            let user: User | null = null;
            try { user = JSON.parse(localStorage.getItem("jbig-profile") || "null"); } catch {}
            const accessToken = localStorage.getItem("jbig-access");
            const refreshToken = localStorage.getItem("jbig-refresh");
            const session = user && accessToken && refreshToken
                ? { id: crypto.randomUUID(), user, accessToken, refreshToken }
                : null;
            save({ session, expired: !!user && !session }, "checking");
            LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
        });
        publish(readAuth(), "checking");
    } catch (error) {
        publish(readAuth(), "error", "로그인 정보를 복원하지 못했습니다. 다시 로그인해주세요.");
        throw error;
    }
}

export function setAuth(user: User | null, accessToken?: string | null, refreshToken?: string | null) {
    const previous = readAuth().session;
    const access = accessToken === undefined ? previous?.accessToken : accessToken;
    const refresh = refreshToken === undefined ? previous?.refreshToken : refreshToken;
    const session = user && access && refresh
        ? { id: crypto.randomUUID(), user, accessToken: access, refreshToken: refresh }
        : null;
    save({ session, expired: false });
}

export const signOutLocal = () => save(emptyRecord);

export function expireSession(sessionId: string) {
    if (readAuth().session?.id === sessionId) save({ session: null, expired: true });
}

// 만료 시각은 갱신 시점에만 사용한다. 권한 판단은 서버가 담당한다.
export function accessRemainingMs(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return typeof payload.exp === "number" ? payload.exp * 1000 - Date.now() - 30000 : 0;
    } catch {
        return 0;
    }
}

export class SessionChangedError extends Error {
    constructor() { super("로그인 상태가 변경되었습니다. 다시 시도해주세요."); }
}

export function ensureSession(rejectedAccess?: string): Promise<Session | null> {
    const initial = readAuth();
    const session = initial.session;
    if (!session || (accessRemainingMs(session.accessToken) > 0 && rejectedAccess !== session.accessToken)) {
        publish(initial);
        return Promise.resolve(session);
    }
    if (pendingRefresh) return pendingRefresh;

    publish(initial, "checking");
    const refresh = async (signal: AbortSignal) => {
        const current = readAuth().session;
        if (current?.id !== session.id) throw new SessionChangedError();
        // 잠금을 기다리는 동안 다른 탭이 갱신했다면 그 결과를 사용한다.
        if (current.refreshToken !== session.refreshToken) return current;

        const { data } = await authTransport.post("/api/users/token/refresh/", {
            refresh: current.refreshToken,
        }, { signal });
        if (readAuth().session?.id !== current.id) throw new SessionChangedError();
        if (!data.access || !data.refresh || !data.isSuccess) throw new Error("Invalid refresh response");

        const next: Session = {
            id: current.id,
            user: { username: data.username, semester: data.semester, email: data.email, is_staff: data.is_staff },
            accessToken: data.access,
            refreshToken: data.refresh,
        };
        save({ session: next, expired: false });
        return next;
    };

    pendingRefresh = Promise.resolve().then(async () => {
        try {
            const result = await withAuthLock(refresh);
            publish(readAuth());
            return result;
        } catch (error) {
            if (readAuth().session?.id !== session.id) throw new SessionChangedError();
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                expireSession(session.id);
                return null;
            }
            const message = navigator.locks
                ? "로그인 상태를 확인하지 못했습니다. 연결을 확인하고 다시 시도해주세요."
                : "이 브라우저에서는 로그인 갱신을 지원하지 않습니다. 다시 로그인해주세요.";
            publish(readAuth(), "error", message);
            throw error;
        } finally {
            pendingRefresh = null;
        }
    });
    return pendingRefresh;
}

export async function signout() {
    const session = readAuth().session;
    signOutLocal();
    if (!session) return { success: true };
    try {
        await authTransport.post("/api/users/logout/", { refresh: session.refreshToken }, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        return { success: true };
    } catch {
        return { success: false };
    }
}
