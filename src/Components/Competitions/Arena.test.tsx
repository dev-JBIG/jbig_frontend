import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Arena from "./Arena";
import * as api from "../../API/arena";

const mockMember = { user: { email: 'arena@jbnu.ac.kr', username: '회원' }, accessToken: 'token', authReady: true };
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom/dist/index.js'), { virtual: true });
jest.mock('../Utils/UserContext', () => ({ useUser: () => mockMember }));
jest.mock('../../API/arena');
const mocked = api as jest.Mocked<typeof api>;
const info: api.ArenaInfo = {
    name: 'JBIG Big Data Arena', phase: 'open', starts_at: null, ends_at: null, finalized_at: null,
    server_time: '2026-11-05T12:00:00+09:00', daily_limit: 5, remaining_today: 5, used_today: 0,
    max_upload_bytes: 5000000, train_rows: 107964, test_rows: 10213, data_version: 'v1', eligible: true, public_name: '참가자 0001',
};
const submission: api.ArenaSubmission = {
    id: 'one', filename: 'my-model.csv', accepted_at: '2026-11-05T12:00:00+09:00',
    status: 'scored', public_rmse: 28.12345, private_rmse: null, is_selected: false,
};

beforeEach(() => {
    jest.clearAllMocks(); sessionStorage.clear();
    mocked.fetchArenaInfo.mockResolvedValue({ ...info });
    mocked.fetchArenaHistory.mockResolvedValue({ count: 0, page: 1, pages: 1, results: [] });
    mocked.fetchArenaLeaderboard.mockResolvedValue({ phase: 'open', metric: 'public_rmse', results: [] });
    mocked.arenaFailure.mockResolvedValue({ message: 'CSV 레코드 18의 adr을 확인해 주세요.', errors: [] });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => '00000000-0000-4000-8000-000000000001' } });
});

function open(path = '/arena') {
    return render(<MemoryRouter initialEntries={[path]}><Arena onLogin={jest.fn()} /></MemoryRouter>);
}

test('overview uses Arena name, explains downloads and contains no source or proposal notice', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'JBIG Big Data Arena' })).toBeInTheDocument();
    await waitFor(() => expect(mocked.fetchArenaInfo).toHaveBeenCalled());
    expect(screen.getByText('sample_submission.csv')).toBeInTheDocument();
    expect(screen.getByText(/활동 여부나 기수에 따른 참가 제한은 없습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/Hotel booking demand|출처|운영진 확정 전/)).not.toBeInTheDocument();
});

test('preparing locks download and upload without inventing dates', async () => {
    mocked.fetchArenaInfo.mockResolvedValue({ ...info, phase: 'preparing' });
    open('/arena/submit');
    expect(await screen.findByText('준비 중')).toBeInTheDocument();
    expect(screen.getByLabelText('예측 결과 CSV를 선택하세요')).toBeDisabled();
    expect(screen.getByRole('button', { name: /제출하기/ })).toBeDisabled();
    expect(screen.getByText(/일정은 확정 후 안내합니다/)).toBeInTheDocument();
});

test('empty leaderboard and history have real empty states', async () => {
    open('/arena/leaderboard');
    expect(await screen.findByText('아직 채점된 제출이 없습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '내 제출' }));
    expect(await screen.findByText('아직 제출한 파일이 없습니다.')).toBeInTheDocument();
});

test('invalid CSV keeps the file and request key for retry without showing a result', async () => {
    mocked.submitArena.mockRejectedValue(new Error('invalid CSV'));
    open('/arena/submit');
    await waitFor(() => expect(screen.getByLabelText('예측 결과 CSV를 선택하세요')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('예측 결과 CSV를 선택하세요'), { target: { files: [new File(['x'], 'prediction.csv', { type: 'text/csv' })] } });
    fireEvent.click(screen.getByRole('button', { name: /제출하기/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CSV 레코드 18');
    fireEvent.click(screen.getByRole('button', { name: /제출하기/ }));
    await waitFor(() => expect(mocked.submitArena).toHaveBeenCalledTimes(2));
    expect(mocked.submitArena.mock.calls[0][2]).toBe(mocked.submitArena.mock.calls[1][2]);
    expect(screen.getByText('오늘 5 / 5회 남음')).toBeInTheDocument();
});

test('accepted upload shows receipt and refreshes records', async () => {
    mocked.submitArena.mockResolvedValue({ submission: { ...submission, status: 'queued' }, remaining_today: 4, replayed: false });
    open('/arena/submit');
    await waitFor(() => expect(screen.getByLabelText('예측 결과 CSV를 선택하세요')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('예측 결과 CSV를 선택하세요'), { target: { files: [new File(['x'], 'prediction.csv')] } });
    fireEvent.click(screen.getByRole('button', { name: /제출하기/ }));
    expect(await screen.findByText(/접수되었습니다/)).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
    expect(screen.getByRole('button', { name: /제출하기/ })).toBeDisabled();
});

test('daily limit and closing disable upload and explain why', async () => {
    mocked.fetchArenaInfo.mockResolvedValue({ ...info, remaining_today: 0 });
    const view = open('/arena/submit');
    expect(await screen.findByText(/오늘 제출 기회를 모두 사용했습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('예측 결과 CSV를 선택하세요')).toBeDisabled();
    view.unmount();
    mocked.fetchArenaInfo.mockResolvedValue({ ...info, phase: 'closed' });
    open('/arena/submissions');
    expect(await screen.findByText(/최종 결과를 집계 중/)).toBeInTheDocument();
});

test('my history shows pending state and lets a received submission be selected', async () => {
    mocked.fetchArenaHistory.mockResolvedValue({ count: 1, page: 1, pages: 1, results: [{ ...submission, status: 'queued', public_rmse: null }] });
    mocked.selectArenaSubmission.mockResolvedValue({ selected_submission_id: 'one' });
    open('/arena/submissions');
    expect(await screen.findByText('채점 대기')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '최종 평가용 선택' }));
    await waitFor(() => expect(mocked.selectArenaSubmission).toHaveBeenCalledWith('one', 'token'));
    expect(await screen.findByText(/최종 평가용 제출을 선택했습니다/)).toBeInTheDocument();
});

test('final leaderboard clearly uses Private score and marks my row', async () => {
    mocked.fetchArenaInfo.mockResolvedValue({ ...info, phase: 'finalized' });
    mocked.fetchArenaLeaderboard.mockResolvedValue({ phase: 'finalized', metric: 'private_rmse', results: [{ rank: 1, public_name: '참가자 0001', score: 25.12346, accepted_at: submission.accepted_at, is_me: true }] });
    open('/arena/leaderboard');
    expect(await screen.findByRole('heading', { name: '최종 리더보드' })).toBeInTheDocument();
    expect(await screen.findByText('25.1235')).toBeInTheDocument();
    expect(screen.getByText('Private RMSE')).toBeInTheDocument();
    expect(screen.getByText('나')).toBeInTheDocument();
});

test('submission page shows the newest receipts after browsing an older history page', async () => {
    mocked.fetchArenaHistory.mockImplementation(async (_token, page = 1) => ({
        count: 21, page, pages: 2, results: [{ ...submission, filename: page === 1 ? 'newest.csv' : 'older.csv' }],
    }));
    open('/arena/submissions');
    expect(await screen.findByText('newest.csv')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText('older.csv')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '제출' }));
    expect(await screen.findByText('newest.csv')).toBeInTheDocument();
    expect(screen.queryByText('older.csv')).not.toBeInTheDocument();
});
