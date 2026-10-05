import axios, { InternalAxiosRequestConfig } from "axios";
import { BASE_URL, ensureSession, expireSession, readAuth, SessionChangedError } from "./auth";

type AuthRequest = InternalAxiosRequestConfig & { sessionId?: string; retried?: boolean };
const client = axios.create();
const apiRoot = `${BASE_URL.replace(/\/$/, "")}/api/`;

function isAuthenticatedRequest(config: InternalAxiosRequestConfig) {
    return new URL(config.url || "", BASE_URL).href.startsWith(apiRoot)
        && !!config.headers.Authorization;
}

client.interceptors.request.use(config => {
    if (!isAuthenticatedRequest(config)) return config;
    const request = config as AuthRequest;
    const session = readAuth().session;
    if (!session || (request.sessionId && request.sessionId !== session.id)) throw new SessionChangedError();
    request.sessionId = session.id;
    request.headers.Authorization = `Bearer ${session.accessToken}`;
    return request;
});

client.interceptors.response.use(response => response, async error => {
    const request = error.config as AuthRequest | undefined;
    if (error.response?.status !== 401 || !request?.sessionId) throw error;
    if (readAuth().session?.id !== request.sessionId) throw new SessionChangedError();
    if (request.retried) {
        expireSession(request.sessionId);
        throw error;
    }

    request.retried = true;
    const rejectedAccess = String(request.headers.Authorization).replace(/^Bearer /, "");
    const session = await ensureSession(rejectedAccess);
    if (!session) throw error;
    if (session.id !== request.sessionId) throw new SessionChangedError();
    return client(request);
});

export default client;
