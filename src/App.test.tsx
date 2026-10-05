import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, CanceledError } from 'axios';
import App from './App';
import { UserProvider } from './Components/Utils/UserContext';
import { AUTH_TIMEOUT_MS, authTransport, ensureSession, readAuth, signOutLocal } from './API/auth';

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    Routes: ({ children }: any) => children,
    Route: ({ path, element }: any) => path === '/note' ? element : null,
    useLocation: () => ({ pathname: '/note' }),
}), { virtual: true });
jest.mock('./Components/Home/Home', () => () => null);
jest.mock('./Components/Signin/Signin', () => () => null);
jest.mock('./Components/Signup/Signup', () => () => null);
jest.mock('./Components/ChangePWD/ChangePWD', () => () => null);
jest.mock('./Components/Footer/Footer', () => () => <footer>JBIG 푸터</footer>);
jest.mock('./Components/Note/Note', () => () => <div>학습자료 본문<input aria-label="작성 중인 글" /></div>);
jest.mock('./Components/Utils/AlertContext', () => ({ AlertProvider: ({ children }: any) => children }));

const user = { username: '회원', semester: '3', email: 'member@jbnu.ac.kr' };
const token = (seconds: number) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.signature`;
const success = (config: any) => ({ config, data: { ...user, isSuccess: true, access: token(3600), refresh: 'rotated' }, status: 200, statusText: 'OK', headers: {} });

beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'session' } });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_n: string, _o: any, fn: any) => fn() } });
    signOutLocal();
    localStorage.clear();
    localStorage.setItem('jbig-profile', JSON.stringify(user));
    localStorage.setItem('jbig-access', token(-60));
    localStorage.setItem('jbig-refresh', 'refresh');
});
afterEach(() => { jest.useRealTimers(); });
const renderApp = () => render(<UserProvider><App /></UserProvider>);

test('startup refresh shows navigation, progress and footer, then renders learning materials', async () => {
    let resolve!: (value: any) => void;
    let config: any;
    authTransport.defaults.adapter = c => { config = c; return new Promise(r => { resolve = r; }); };
    renderApp();
    expect(screen.getByRole('status')).toHaveTextContent('로그인 상태를 확인');
    expect(screen.getByRole('link', { name: 'JBIG' })).toHaveAttribute('href', '/');
    expect(screen.getByText('JBIG 푸터')).toBeInTheDocument();
    expect(screen.queryByText('학습자료 본문')).not.toBeInTheDocument();
    await act(async () => {});
    await act(async () => { resolve(success(config)); });
    expect(await screen.findByText('학습자료 본문')).toBeInTheDocument();
});

test('a hung refresh becomes an actionable error after 15 seconds and retry recovers', async () => {
    jest.useFakeTimers();
    authTransport.defaults.adapter = config => new Promise((_r, reject) => {
        config.signal?.addEventListener?.('abort', () => reject(new CanceledError('aborted')));
    });
    renderApp();
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(AUTH_TIMEOUT_MS); });
    expect(screen.getByRole('alert')).toHaveTextContent('로그인 상태를 확인하지 못했습니다');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled();
    expect(screen.getByText('JBIG 푸터')).toBeInTheDocument();
    expect(readAuth().session).not.toBeNull();
    // 오류 상태가 같은 토큰의 타이머를 다시 만들어 무한 갱신하지 않는다.
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    authTransport.defaults.adapter = async config => success(config);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await act(async () => {});
    expect(screen.getByText('학습자료 본문')).toBeInTheDocument();
});

test('invalid refresh logs out and shows the session expiry notice', async () => {
    authTransport.defaults.adapter = config => Promise.reject(new AxiosError('expired', '', config, undefined,
        { config, data: {}, status: 401, statusText: '', headers: {} }));
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('세션이 만료');
    expect(readAuth().session).toBeNull();
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute('href', '/signin');
});

test('background refresh preserves mounted content and unsaved input', async () => {
    localStorage.setItem('jbig-access', token(3600));
    renderApp();
    const input = await screen.findByRole('textbox', { name: '작성 중인 글' });
    fireEvent.change(input, { target: { value: '작성 중인 내용' } });
    let resolve!: (value: any) => void;
    let config: any;
    authTransport.defaults.adapter = c => { config = c; return new Promise(r => { resolve = r; }); };
    let pending!: Promise<unknown>;
    await act(async () => { pending = ensureSession(readAuth().session!.accessToken); });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('작성 중인 내용');
    await act(async () => { resolve(success(config)); await pending; });
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('작성 중인 내용');
});

test('the existing tab checks expiry on focus and updates its session', async () => {
    const now = Date.now();
    localStorage.setItem('jbig-access', token(60));
    const adapter = jest.fn(async config => success(config));
    authTransport.defaults.adapter = adapter;
    renderApp();
    await screen.findByText('학습자료 본문');
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
    expect(readAuth().session?.refreshToken).toBe('rotated');
    spy.mockRestore();
});
