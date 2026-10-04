import axios, { AxiosError, AxiosAdapter } from "axios";

const mockBroadcast = jest.fn();
let signin: typeof import('./req').signin;
beforeAll(() => {
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: class {
        postMessage = mockBroadcast;
    } });
    signin = require('./req').signin;
});
const originalAdapter = axios.defaults.adapter;
afterEach(() => { axios.defaults.adapter = originalAdapter; localStorage.clear(); jest.clearAllMocks(); });
const reject = (config: any, data: any) => Promise.reject(new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined,
    { config, data, status: 401, statusText: 'Unauthorized', headers: {} }));

test.each(['ACCOUNT_NOT_VERIFIED', 'INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE'])(
    'signin preserves %s and HTTP status with an existing refresh token', async errorCode => {
        localStorage.setItem('jbig-refresh', 'stale-refresh');
        const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
        adapter.mockImplementation(config => reject(config, { errorCode, message: '로그인 실패' }));
        axios.defaults.adapter = adapter;
        expect(await signin('member@jbnu.ac.kr', 'Password!1x')).toMatchObject({ status: 401, errorCode, message: '로그인 실패' });
        expect(adapter).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('jbig-refresh')).toBe('stale-refresh');
        expect(mockBroadcast).not.toHaveBeenCalled();
    }
);

test('protected API still refreshes and retries with the new access token', async () => {
    localStorage.setItem('jbig-refresh', 'old-refresh');
    const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
    adapter.mockImplementationOnce(config => reject(config, { detail: 'expired' }));
    adapter.mockImplementationOnce(async config => ({ config, data: { access: 'new-access', refresh: 'new-refresh' }, status: 200, statusText: 'OK', headers: {} }));
    adapter.mockImplementationOnce(async config => ({ config, data: { ok: true }, status: 200, statusText: 'OK', headers: {} }));
    axios.defaults.adapter = adapter;
    expect((await axios.get('/api/protected/', { headers: { Authorization: 'Bearer expired' } })).data).toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(3);
    expect(adapter.mock.calls[1][0].url).toContain('/token/refresh/');
    expect(adapter.mock.calls[2][0].headers.Authorization).toBe('Bearer new-access');
    expect(localStorage.getItem('jbig-refresh')).toBe('new-refresh');
});
