import { AxiosError } from "axios";
import { submitArena } from "./arena";
import client from "./client";
import { authTransport, setAuth, signOutLocal } from "./auth";

const user = { username: '회원', semester: '1', email: 'arena@jbnu.ac.kr' };
const token = (seconds: number) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.signature`;

afterEach(() => { signOutLocal(); jest.restoreAllMocks(); });

test('JWT refresh retries an upload with the same body and idempotency key', async () => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'arena-session' } });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name: string, _options: unknown, callback: () => unknown) => callback() } });
    setAuth(user, token(-60), 'refresh-token');
    const calls: any[] = [];
    client.defaults.adapter = jest.fn(async config => {
        calls.push(config);
        if (calls.length === 1) throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} });
        return { config, data: { remaining_today: 4 }, status: 202, statusText: 'Accepted', headers: {} };
    });
    authTransport.defaults.adapter = jest.fn(async config => ({ config, data: { ...user, isSuccess: true, access: token(3600), refresh: 'new-refresh' }, status: 200, statusText: 'OK', headers: {} }));
    await submitArena(new File(['reservation_id,adr\na,1'], 'submission.csv'), 'old-token', 'fixed-key', () => {});
    expect(calls).toHaveLength(2);
    expect(calls[0].headers['Idempotency-Key']).toBe('fixed-key');
    expect(calls[1].headers['Idempotency-Key']).toBe('fixed-key');
    expect(calls[1].data).toBe(calls[0].data);
});
