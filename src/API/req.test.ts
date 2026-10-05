import { AxiosError, AxiosAdapter } from "axios";
import client from "./client";
import { authTransport, getAuthState, readAuth, setAuth, signOutLocal, subscribeAuth } from "./auth";
import { createPost, fetchPostDetail, fetchQuizUrl, signin } from "./req";

const user = { username: "회원", semester: "3", email: "member@jbnu.ac.kr", is_staff: false };
const token = (seconds: number) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.signature`;
const ok = (config: any, data: any) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const reject = (config: any, status = 401, data: any = { detail: 'expired' }) => Promise.reject(
    new AxiosError('request failed', 'ERR_BAD_REQUEST', config, undefined, { config, data, status, statusText: 'Error', headers: {} })
);
let adapter: jest.Mock<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>;
let refreshAdapter: jest.Mock<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>;
let freshAccess: string;

beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'session-id' } });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name: string, _options: any, callback: () => unknown) => callback() } });
    localStorage.clear();
    setAuth(user, token(-60), 'old-refresh');
    freshAccess = token(3600);
    adapter = jest.fn();
    refreshAdapter = jest.fn(async config => ok(config, { ...user, isSuccess: true, access: freshAccess, refresh: 'new-refresh' }));
    client.defaults.adapter = adapter;
    authTransport.defaults.adapter = refreshAdapter;
});
afterEach(() => { signOutLocal(); jest.restoreAllMocks(); });

test.each(['ACCOUNT_NOT_VERIFIED', 'INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE'])(
    'signin preserves %s without refreshing an existing session', async errorCode => {
        adapter.mockImplementation(config => reject(config, 401, { errorCode, message: '로그인 실패' }));
        expect(await signin(user.email, 'Password!1x')).toMatchObject({ status: 401, errorCode, message: '로그인 실패' });
        expect(refreshAdapter).not.toHaveBeenCalled();
        expect(readAuth().session?.refreshToken).toBe('old-refresh');
    }
);

test('post detail refreshes, retries and publishes fresh state to UI subscribers', async () => {
    const states: string[] = [];
    const unsubscribe = subscribeAuth(() => { states.push(getAuthState().session?.accessToken || ''); });
    adapter.mockImplementationOnce(config => reject(config));
    adapter.mockImplementationOnce(async config => ok(config, { id: 1, title: '본문' }));
    expect(await fetchPostDetail(1, 'stale-context-token')).toMatchObject({ id: 1 });
    expect(refreshAdapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe(`Bearer ${freshAccess}`);
    expect(readAuth().session?.refreshToken).toBe('new-refresh');
    expect(states).toContain(freshAccess);
    unsubscribe();
});

test('post creation also uses the shared refresh path', async () => {
    adapter.mockImplementationOnce(config => reject(config));
    adapter.mockImplementationOnce(async config => ok(config, { id: 2 }));
    expect(await createPost(1, { title: '제목', content_md: '본문', attachment_paths: [] }, 'old-access')).toEqual({ id: 2 });
    expect(refreshAdapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[1][0].data).toBe(adapter.mock.calls[0][0].data);
});

test('403 stays a permission failure and does not expire the session', async () => {
    adapter.mockImplementation(config => reject(config, 403));
    expect(await fetchPostDetail(1, 'old-access')).toEqual({ unauthorized: true });
    expect(refreshAdapter).not.toHaveBeenCalled();
    expect(readAuth().session).not.toBeNull();
});

test('expired refresh clears the session and produces a login result, not forbidden', async () => {
    adapter.mockImplementation(config => reject(config));
    refreshAdapter.mockImplementation(config => reject(config));
    expect(await fetchPostDetail(1, 'old-access')).toEqual({ loginRequired: true });
    expect(readAuth()).toEqual({ session: null, expired: true });
});

test('server failure preserves the session and can be retried', async () => {
    adapter.mockImplementation(config => reject(config));
    refreshAdapter.mockImplementationOnce(config => reject(config, 503));
    await expect(fetchPostDetail(1, 'old-access')).rejects.toMatchObject({ response: { status: 503 } });
    expect(readAuth().session?.refreshToken).toBe('old-refresh');
    expect(getAuthState().status).toBe('error');
    adapter.mockImplementationOnce(config => reject(config));
    adapter.mockImplementationOnce(async config => ok(config, { id: 1 }));
    expect(await fetchPostDetail(1, 'old-access')).toMatchObject({ id: 1 });
});

test('quiz authentication failure preserves the central session-expired notice', async () => {
    adapter.mockImplementation(config => reject(config));
    refreshAdapter.mockImplementation(config => reject(config));
    await expect(fetchQuizUrl('old-access')).rejects.toMatchObject({ response: { status: 401 } });
    expect(readAuth()).toEqual({ session: null, expired: true });
});

test('multiple 401s share one refresh', async () => {
    adapter.mockImplementation(config => config.headers.Authorization === `Bearer ${freshAccess}`
        ? Promise.resolve(ok(config, { id: 1 })) : reject(config));
    await Promise.all([fetchPostDetail(1, 'old'), fetchPostDetail(2, 'old'), fetchPostDetail(3, 'old')]);
    expect(refreshAdapter).toHaveBeenCalledTimes(1);
});

test('a second 401 terminates the session without a retry loop', async () => {
    adapter.mockImplementation(config => reject(config));
    expect(await fetchPostDetail(1, 'old')).toEqual({ loginRequired: true });
    expect(refreshAdapter).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(readAuth().session).toBeNull();
});

test('public and external requests do not use the auth refresh interceptor', async () => {
    adapter.mockImplementation(config => reject(config));
    await expect(client.get('/api/settings/')).rejects.toBeDefined();
    await expect(client.put('https://storage.example/upload', 'file')).rejects.toBeDefined();
    expect(refreshAdapter).not.toHaveBeenCalled();
    expect(adapter.mock.calls.every(([config]) => !config.headers.Authorization)).toBe(true);
});

test('logout while a request is in flight cannot log out a subsequent login', async () => {
    let rejectRequest!: () => void;
    adapter.mockImplementation(config => new Promise((_resolve, rejectPromise) => {
        rejectRequest = () => rejectPromise(new AxiosError('expired', '', config, undefined,
            { config, data: {}, status: 401, statusText: '', headers: {} }));
    }));
    const request = fetchPostDetail(1, 'old');
    for (let i = 0; i < 8; i++) await Promise.resolve();
    signOutLocal();
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: () => 'new-session-id' });
    setAuth({ ...user, username: '다른 회원' }, freshAccess, 'different-refresh');
    rejectRequest();
    await expect(request).rejects.toThrow('로그인 상태가 변경');
    expect(readAuth().session?.user.username).toBe('다른 회원');
    expect(refreshAdapter).not.toHaveBeenCalled();
});
