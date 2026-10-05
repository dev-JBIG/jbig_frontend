import { AxiosError, CanceledError } from 'axios';
import * as auth from './auth';

const user = { username: '회원', semester: '3', email: 'member@jbnu.ac.kr' };
const token = (seconds: number) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.signature`;
const success = (config: any) => ({ config, data: { ...user, isSuccess: true, access: token(3600), refresh: 'rotated' }, status: 200, statusText: 'OK', headers: {} });
let lockTail: Promise<unknown>;
let requestLock: jest.Mock;
let nextId = 0;

beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => `session-${++nextId}` } });
    lockTail = Promise.resolve();
    requestLock = jest.fn((_name, { signal }, callback) => {
        const run = lockTail.catch(() => {}).then(() => {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            return callback();
        });
        lockTail = run.catch(() => {});
        return Promise.race([run, new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })]);
    });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: requestLock } });
    auth.setAuth(user, token(-60), 'refresh');
    auth.authTransport.defaults.adapter = async config => success(config);
});
afterEach(() => { auth.signOutLocal(); jest.useRealTimers(); });

test('restores existing users into one atomic session record and removes legacy state', async () => {
    localStorage.clear();
    localStorage.setItem('jbig-profile', JSON.stringify(user));
    localStorage.setItem('jbig-access', token(3600));
    localStorage.setItem('jbig-refresh', 'legacy-refresh');
    localStorage.setItem('jbig-staff-auth', 'true');
    await auth.restoreAuth();
    expect(auth.readAuth().session).toMatchObject({ user, refreshToken: 'legacy-refresh' });
    expect(localStorage.getItem('jbig-refresh')).toBeNull();
    expect(localStorage.getItem('jbig-staff-auth')).toBeNull();
});

test('valid access does not rotate merely because a new tab starts', async () => {
    auth.setAuth(user, token(3600), 'refresh');
    await auth.ensureSession();
    expect(requestLock).not.toHaveBeenCalled();
});

test('two new tabs migrate legacy storage without overwriting each other', async () => {
    localStorage.clear();
    localStorage.setItem('jbig-profile', JSON.stringify(user));
    localStorage.setItem('jbig-access', token(-60));
    localStorage.setItem('jbig-refresh', 'legacy-refresh');
    let secondTab!: typeof auth;
    jest.isolateModules(() => { secondTab = require('./auth'); });
    await Promise.all([auth.restoreAuth(), secondTab.restoreAuth()]);
    expect(auth.readAuth().session?.refreshToken).toBe('legacy-refresh');
    expect(secondTab.getAuthState().session?.id).toBe(auth.getAuthState().session?.id);
});

test('two tab modules serialize refresh and reuse the first result', async () => {
    let secondTab!: typeof auth;
    jest.isolateModules(() => { secondTab = require('./auth'); });
    const firstAdapter = jest.fn(async config => success(config));
    const secondAdapter = jest.fn(async config => success(config));
    auth.authTransport.defaults.adapter = firstAdapter;
    secondTab.authTransport.defaults.adapter = secondAdapter;
    const [first, second] = await Promise.all([auth.ensureSession(), secondTab.ensureSession()]);
    expect(first?.accessToken).toBe(second?.accessToken);
    expect(firstAdapter).toHaveBeenCalledTimes(1);
    expect(secondAdapter).not.toHaveBeenCalled();
});

test('storage notifications reread current state instead of replaying stale payloads', () => {
    auth.setAuth(user, token(3600), 'latest-refresh');
    window.dispatchEvent(new StorageEvent('storage', { key: auth.SESSION_KEY, newValue: '{"session":null}' }));
    expect(auth.getAuthState().session?.refreshToken).toBe('latest-refresh');
    localStorage.setItem(auth.SESSION_KEY, JSON.stringify({ session: null, expired: true }));
    window.dispatchEvent(new StorageEvent('storage', { key: auth.SESSION_KEY }));
    expect(auth.getAuthState()).toMatchObject({ session: null, expired: true });
});

test('late refresh success cannot resurrect a logged out session', async () => {
    let resolve!: (value: any) => void;
    let config: any;
    auth.authTransport.defaults.adapter = c => { config = c; return new Promise(r => { resolve = r; }); };
    const pending = auth.ensureSession();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    auth.signOutLocal();
    resolve(success(config));
    await expect(pending).rejects.toThrow('로그인 상태가 변경');
    expect(auth.readAuth().session).toBeNull();
});

test('late refresh rejection cannot clear a new login', async () => {
    let reject!: (value: any) => void;
    let config: any;
    auth.authTransport.defaults.adapter = c => { config = c; return new Promise((_r, j) => { reject = j; }); };
    const pending = auth.ensureSession();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    auth.setAuth({ ...user, username: '새 로그인' }, token(3600), 'new-login-refresh');
    reject(new AxiosError('expired', '', config, undefined, { config, data: {}, status: 401, statusText: '', headers: {} }));
    await expect(pending).rejects.toThrow('로그인 상태가 변경');
    expect(auth.readAuth().session?.refreshToken).toBe('new-login-refresh');
});

test('refresh network timeout is bounded and preserves credentials for retry', async () => {
    jest.useFakeTimers();
    auth.authTransport.defaults.adapter = config => new Promise((_resolve, reject) => {
        config.signal?.addEventListener?.('abort', () => reject(new CanceledError('aborted')));
    });
    const pending = auth.ensureSession();
    const rejected = expect(pending).rejects.toBeDefined();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    jest.advanceTimersByTime(auth.AUTH_TIMEOUT_MS);
    await rejected;
    expect(auth.readAuth().session?.refreshToken).toBe('refresh');
    expect(auth.getAuthState().status).toBe('error');
    auth.authTransport.defaults.adapter = async config => success(config);
    expect((await auth.ensureSession())?.refreshToken).toBe('rotated');
});

test('lock waiting has the same deadline and never issues a late refresh', async () => {
    jest.useFakeTimers();
    let unlock!: () => void;
    lockTail = new Promise(resolve => { unlock = () => resolve(undefined); });
    const adapter = jest.fn(async config => success(config));
    auth.authTransport.defaults.adapter = adapter;
    const pending = auth.ensureSession();
    const rejected = expect(pending).rejects.toBeDefined();
    await Promise.resolve();
    jest.advanceTimersByTime(auth.AUTH_TIMEOUT_MS);
    await rejected;
    unlock();
    await lockTail;
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(adapter).not.toHaveBeenCalled();
});

test('unsupported locking never falls back to unsafe concurrent refresh', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    await expect(auth.ensureSession()).rejects.toThrow();
    expect(auth.getAuthState().error).toContain('다시 로그인');
    expect(auth.readAuth().session).not.toBeNull();
});

test('logout clears UI immediately and revokes the latest token at the correct endpoint', async () => {
    auth.setAuth(user, token(3600), 'latest-refresh');
    const adapter = jest.fn(async config => {
        expect(auth.readAuth().session).toBeNull();
        return success(config);
    });
    auth.authTransport.defaults.adapter = adapter;
    expect(await auth.signout()).toEqual({ success: true });
    expect(adapter.mock.calls[0][0].url).toBe('/api/users/logout/');
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ refresh: 'latest-refresh' });
});
