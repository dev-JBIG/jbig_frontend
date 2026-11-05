import React, { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, Check, CircleAlert, Clock3, FileUp, Trophy } from "lucide-react";
import {
    ArenaFailure, ArenaHistory, ArenaInfo, ArenaLeaderboard, ArenaSubmission, arenaFailure,
    downloadArenaData, fetchArenaHistory, fetchArenaInfo, fetchArenaLeaderboard, selectArenaSubmission, submitArena,
} from "../../API/arena";
import { useUser } from "../Utils/UserContext";
import "./Arena.css";

const dateTime = (value: string) => new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(value));
const score = (value: number | null) => value == null ? "—" : value.toFixed(4);
const phaseNames = { preparing: "준비 중", open: "진행 중", closed: "접수 마감", finalized: "최종 결과" };
const statusNames = { queued: "채점 대기", scoring: "채점 중", scored: "채점 완료", error: "채점 지연 · 복구 중" };
const fields = [
    ["hotel", "도심 호텔 또는 리조트 호텔"], ["reserved_room_type", "예약한 객실 유형 코드"], ["meal", "식사 유형 코드"],
    ["arrival_month", "예정 도착 월 (1~12)"], ["arrival_weekday", "예정 도착 요일 (Monday 등)"],
    ["lead_time", "예약 등록일부터 예정 도착일까지의 일수"], ["stays_in_week_nights", "주중 숙박일 수"],
    ["stays_in_weekend_nights", "주말 숙박일 수"], ["adults", "성인 수"], ["children", "어린이 수 · 결측은 학습 과정에서 처리"],
    ["babies", "영유아 수"], ["market_segment", "예약의 시장 구분"], ["distribution_channel", "예약 유통 경로"],
];
const emptyHistory: ArenaHistory = { count: 0, page: 1, pages: 1, results: [] };

interface ArenaProps { onLogin: () => void; }

export default function Arena({ onLogin }: ArenaProps) {
    const { user, accessToken, authReady } = useUser();
    const path = useLocation().pathname.replace(/\/$/, "");
    const page = path === "/arena" ? "overview" : path.split("/").pop() || "overview";
    const [info, setInfo] = useState<ArenaInfo | null>(null);
    const [history, setHistory] = useState<ArenaHistory>(emptyHistory);
    const [leaderboard, setLeaderboard] = useState<ArenaLeaderboard | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [failure, setFailure] = useState<ArenaFailure | null>(null);
    const [notice, setNotice] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "validating">("idle");
    const [progress, setProgress] = useState(0);
    const [downloading, setDownloading] = useState("");
    const [selecting, setSelecting] = useState("");
    const requestKey = useRef("");
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingStorage = `jbig-arena-pending:${user?.email || "anonymous"}`;
    const eligible = !!accessToken && !!info?.eligible;

    useEffect(() => {
        setFile(null); setFailure(null); setNotice(""); setInfo(null); setHistory(emptyHistory); setLeaderboard(null);
        if (inputRef.current) inputRef.current.value = "";
    }, [user?.email]);

    useEffect(() => { setFailure(null); setNotice(""); }, [page]);

    useEffect(() => {
        if (!authReady) return;
        const controller = new AbortController();
        let disposed = false, loading = false;
        const load = async () => {
            if (loading || document.visibilityState === "hidden") return;
            loading = true;
            try {
                const current = await fetchArenaInfo(accessToken || undefined, controller.signal);
                if (disposed) return;
                setInfo(current); setLoadError(null);
                if (current.eligible && accessToken) {
                    const [records, board] = await Promise.all([
                        page === 'submit' || page === 'submissions' ? fetchArenaHistory(accessToken, page === 'submissions' ? historyPage : 1, controller.signal) : Promise.resolve(null),
                        page === 'leaderboard' ? fetchArenaLeaderboard(accessToken, controller.signal) : Promise.resolve(null),
                    ]);
                    if (disposed) return;
                    if (records) setHistory(records);
                    if (board) setLeaderboard(board);
                    const pending = sessionStorage.getItem(pendingStorage);
                    if (pending) {
                        const recovered = await fetchArenaHistory(accessToken, 1, controller.signal, pending);
                        if (!disposed && recovered.count) {
                            setNotice("지난 요청의 접수를 확인했습니다. 내 제출 기록에서 처리 상태를 확인해 주세요.");
                            sessionStorage.removeItem(pendingStorage);
                        }
                    }
                } else {
                    setHistory(emptyHistory); setLeaderboard(null);
                }
            } catch (error) {
                if (!disposed) setLoadError((await arenaFailure(error)).message);
            } finally { loading = false; }
        };
        void load();
        const interval = window.setInterval(() => { void load(); }, 5000);
        const visible = () => { if (document.visibilityState === "visible") void load(); };
        document.addEventListener("visibilitychange", visible);
        return () => { disposed = true; controller.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
    }, [accessToken, authReady, user?.email, historyPage, refresh, pendingStorage, page]);

    if (!["overview", "submit", "leaderboard", "submissions"].includes(page)) return <Navigate to="/arena" replace />;

    const uploadBusy = uploadStage !== "idle";
    const canSubmit = eligible && info?.phase === "open" && (info.remaining_today || 0) > 0 && !uploadBusy;
    const downloadLocked = !eligible || info?.phase === "preparing";

    async function download(kind: "train" | "test" | "sample") {
        if (!accessToken) return;
        setFailure(null); setDownloading(kind);
        try {
            const blob = await downloadArenaData(kind, accessToken);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url; anchor.download = kind === "sample" ? "sample_submission.csv" : `${kind}.csv`;
            anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { setFailure(await arenaFailure(error)); }
        finally { setDownloading(""); }
    }

    function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
        setNotice(""); setFailure(null);
        const chosen = event.target.files?.[0] || null;
        if (chosen && (!chosen.name.toLowerCase().endsWith(".csv") || chosen.size > (info?.max_upload_bytes || 5_000_000))) {
            setFailure({ message: "5MB(5,000,000바이트) 이하의 .csv 파일을 선택해 주세요.", errors: [] });
            setFile(null); event.target.value = ""; return;
        }
        requestKey.current = crypto.randomUUID();
        setFile(chosen);
    }

    async function send(event: React.FormEvent) {
        event.preventDefault();
        if (!file || !accessToken || !canSubmit) return;
        setFailure(null); setNotice(""); setProgress(0); setUploadStage("uploading");
        sessionStorage.setItem(pendingStorage, requestKey.current);
        try {
            const result = await submitArena(file, accessToken, requestKey.current, value => {
                setProgress(value); if (value >= 100) setUploadStage("validating");
            });
            sessionStorage.removeItem(pendingStorage);
            setNotice(`${result.replayed ? "기존 접수를 확인했습니다" : "접수되었습니다"}. 채점 결과는 내 제출 기록에서 확인할 수 있습니다.`);
            setInfo(current => current ? { ...current, remaining_today: result.remaining_today } : current);
            setFile(null); if (inputRef.current) inputRef.current.value = "";
            setHistoryPage(1); setRefresh(value => value + 1);
        } catch (error) { setFailure(await arenaFailure(error)); }
        finally { setUploadStage("idle"); }
    }

    async function select(id: string) {
        if (!accessToken || selecting) return;
        setFailure(null); setSelecting(id);
        try {
            await selectArenaSubmission(id, accessToken);
            setHistory(current => ({ ...current, results: current.results.map(row => ({ ...row, is_selected: row.id === id })) }));
            setNotice("최종 평가용 제출을 선택했습니다. 마감 전까지 다른 제출로 변경할 수 있습니다.");
            setRefresh(value => value + 1);
        } catch (error) { setFailure(await arenaFailure(error)); }
        finally { setSelecting(""); }
    }

    const downloads = <section className="arena-card arena-downloads" aria-labelledby="arena-download-title">
        <h2 id="arena-download-title">시작에 필요한 데이터</h2>
        <p className="arena-muted">Train으로 학습하고, Test의 예약마다 ADR을 하나씩 예측하세요.</p>
        <div className="arena-file-buttons">
            {([['train', 'train.csv', `${(info?.train_rows || 107964).toLocaleString()}행 · 실제 adr 포함`], ['test', 'test.csv', `${(info?.test_rows || 10213).toLocaleString()}행 · 예측 대상`], ['sample', 'sample_submission.csv', '실제 Test ID를 담은 제출 예시']] as const).map(([kind, name, caption]) =>
                <button type="button" className="arena-file-button" key={kind} disabled={downloadLocked || !!downloading} onClick={() => { void download(kind); }}>
                    <ArrowDownToLine size={18} aria-hidden="true" /><span><strong>{downloading === kind ? "다운로드 준비 중…" : name}</strong><small>{caption}</small></span>
                </button>)}
        </div>
        <p className="arena-muted">{!eligible ? "로그인한 JBIG 회원이 내려받을 수 있습니다." : info?.phase === "preparing" ? "대회가 개방되면 다운로드할 수 있습니다." : "원본 ID와 열 이름을 유지해 주세요."}</p>
    </section>;

    function records(rows: ArenaSubmission[], compact = false) {
        if (!rows.length) return <div className="arena-empty"><FileUp size={24} aria-hidden="true" /><h3>아직 제출한 파일이 없습니다.</h3><p>모델의 예측 결과를 CSV로 제출해 보세요.</p></div>;
        return <div className="arena-records">{rows.map(row => <article key={row.id} className={`arena-record${row.is_selected ? " arena-selected" : ""}`}>
            <div className="arena-record-file"><strong>{row.filename}</strong><time dateTime={row.accepted_at}>{dateTime(row.accepted_at)} KST</time><span className={`arena-processing arena-processing-${row.status}`}>{statusNames[row.status]}</span></div>
            <div className="arena-record-score"><strong>{score(row.public_rmse)}</strong><small>Public RMSE</small>{row.private_rmse != null && <><strong>{score(row.private_rmse)}</strong><small>최종 Private RMSE</small></>}</div>
            {!compact && <button type="button" className={`arena-button arena-select${row.is_selected ? " arena-selection-active" : ""}`} disabled={info?.phase !== "open" || !!selecting || row.is_selected} onClick={() => { void select(row.id); }}>
                {row.is_selected ? <><Check size={15} aria-hidden="true" /> 최종 평가용 선택됨</> : selecting === row.id ? "선택 중…" : "최종 평가용 선택"}
            </button>}
            {row.status === "error" && <p className="arena-record-help">서버에서 채점을 복구하고 있습니다. 같은 접수로 다시 처리하며 제출 횟수를 추가로 차감하지 않습니다.</p>}
        </article>)}</div>;
    }

    return <div className="arena">
        <header className="arena-header">
            <div className="arena-eyebrow"><span>JBIG · LEARN &amp; CHALLENGE</span>{info && <span className={`arena-status arena-status-${info.phase}`}>{phaseNames[info.phase]}</span>}</div>
            <h1>JBIG Big Data Arena</h1><p className="arena-subtitle">예약에 기록된 1박 평균 숙박요금 예측</p>
            <p className="arena-schedule">{info?.starts_at && info.ends_at ? `${dateTime(info.starts_at)} ~ ${dateTime(info.ends_at)} KST` : "일정은 확정 후 안내합니다 · Asia/Seoul (KST)"}</p>
        </header>
        <nav className="arena-tabs" aria-label="Arena 메뉴">{[['overview', '/arena', '대회 안내'], ['submit', '/arena/submit', '제출'], ['leaderboard', '/arena/leaderboard', '리더보드'], ['submissions', '/arena/submissions', '내 제출']].map(([key, to, label]) => <NavLink key={key} to={to} end={key === 'overview'}>{label}</NavLink>)}</nav>
        {!info && !loadError && <p className="arena-notice" role="status">대회 정보를 불러오고 있습니다…</p>}
        {loadError && <div className="arena-notice arena-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><div>{loadError}<button type="button" className="arena-inline-button" onClick={() => setRefresh(value => value + 1)}>다시 확인</button></div></div>}
        {failure && <div className="arena-notice arena-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><div><strong>{failure.message}</strong>{failure.errors.length > 0 && <ul>{failure.errors.map((error, index) => <li key={index}>{error.message}</li>)}</ul>}</div></div>}
        {notice && <p className="arena-notice" role="status" aria-live="polite">{notice}</p>}
        {info?.phase === "preparing" && <p className="arena-notice arena-neutral">운영진이 대회를 준비하고 있습니다. 대회가 개방되면 데이터 다운로드와 제출을 이용할 수 있습니다.</p>}
        {info?.phase === "closed" && <p className="arena-notice arena-neutral">접수가 마감되었습니다. 최종 결과를 집계 중입니다. 제출과 최종 평가용 선택을 변경할 수 없습니다.</p>}
        {info?.phase === "finalized" && <p className="arena-notice">최종 결과가 확정되었습니다. 선택된 제출의 Private RMSE로 최종 순위가 결정됩니다.</p>}
        {!accessToken && <div className="arena-login"><p>JBIG 회원이라면 활동 여부와 관계없이 참가할 수 있습니다.</p><button type="button" className="arena-button arena-primary" onClick={onLogin}>로그인하고 참여하기 <ArrowRight size={16} aria-hidden="true" /></button></div>}
        {accessToken && info && !info.eligible && <p className="arena-notice arena-error" role="alert">회원 인증 상태를 확인해 주세요. 로그인 가능한 JBIG 회원 계정으로 참여할 수 있습니다.</p>}

        {page === "overview" && <>
            <div className="arena-overview-grid"><section className="arena-intro"><h2>이전 예약 기록으로<br />다음 예약의 ADR을 예측하세요.</h2><p>2017년 7~8월에 도착 예정인 예약의 1박 평균 숙박요금, <strong>ADR</strong>을 예측하는 회귀 문제입니다.</p><ol className="arena-steps"><li><span>1</span><div><strong>Train으로 모델 학습</strong><p>예약 정보와 실제 ADR인 adr 열을 사용합니다.</p></div></li><li><span>2</span><div><strong>Test {(info?.test_rows || 10213).toLocaleString()}건 예측</strong><p>각 예약에 대해 ADR을 하나씩 예측합니다.</p></div></li><li><span>3</span><div><strong>ID와 adr 두 열의 CSV 제출</strong><p>제출 예시의 형식에 맞춰 파일을 올립니다.</p></div></li></ol><NavLink to="/arena/submit" className="arena-button arena-primary">예측 CSV 제출하기 <ArrowRight size={16} aria-hidden="true" /></NavLink></section>{downloads}</div>
            <section className="arena-metric-band"><div><span>평가지표</span><strong>RMSE <small>낮을수록 좋습니다</small></strong></div><p>대회 중에는 Public 점수를 확인합니다.<br /><strong>최종 순위는 선택한 제출의 Private 점수로 결정됩니다.</strong></p></section>
            <p className="arena-muted">RMSE는 예측값과 실제 ADR의 차이를 제곱해 평균낸 뒤 제곱근을 구한 값입니다. 서버가 예약 ID로 정답과 예측을 연결해 원래 ADR 척도에서 평가합니다.</p>
            <section className="arena-section"><h2>데이터와 문제 이해하기</h2><p>한 행은 호텔 예약 한 건입니다. 3박 예약에 기록된 숙박요금 합계가 360이면 ADR은 120입니다. 취소된 예약도 대상 조건에 맞으면 포함됩니다.</p><div className="arena-data-periods"><div><span>TRAIN</span><strong>2015년 7월 ~ 2017년 6월</strong><p>{(info?.train_rows || 107964).toLocaleString()}건 · ID + 설명변수 13개 + adr</p></div><div><span>TEST</span><strong>2017년 7월 ~ 8월</strong><p>{(info?.test_rows || 10213).toLocaleString()}건 · ID + 설명변수 13개</p></div></div><p className="arena-muted">총숙박일과 총인원이 각각 1 이상이고 실제 ADR이 0 이상인 예약을 사용합니다. Train은 최종 상태 기록일이 2017년 7월 1일 이전인 예약만 포함합니다. 정확한 도착일은 제공하지 않으며 월·요일만 포함됩니다. 데이터의 수치 노이즈나 ADR 스케일 변환은 적용하지 않았습니다.</p><details className="arena-variables"><summary>설명변수 13개 보기</summary><dl>{fields.map(([name, description]) => <div key={name}><dt><code>{name}</code></dt><dd>{description}</dd></div>)}</dl></details></section>
            <section className="arena-section"><h2>참가와 평가 규칙</h2><ul className="arena-rules"><li>JBIG 회원 누구나 개인으로 참가합니다. 활동 여부나 기수에 따른 참가 제한은 없습니다.</li><li>하루 최대 {info?.daily_limit || 5}회 제출할 수 있으며, 날짜는 Asia/Seoul 기준입니다. 형식 검증을 통과해 정상 접수된 제출부터 횟수에 포함합니다.</li><li>채점 대기 중인 제출도 횟수에 포함됩니다. 서버 채점 오류는 같은 접수로 복구하며 중복 차감하지 않습니다.</li><li>고정된 Test의 약 30%로 Public RMSE, 약 70%로 최종 Private RMSE를 계산합니다. 같은 설명변수 조합의 예약은 같은 평가 쪽에 배치합니다.</li><li>대회 중 개인별 최저 Public RMSE를 리더보드에 표시합니다. 최종 평가용 제출 한 건을 마감 전 선택하세요. 대기 중인 정상 접수도 선택할 수 있습니다.</li><li>선택하지 않으면 Public RMSE가 가장 낮은 제출을 자동 선택합니다. 동점이면 먼저 정상 접수된 제출이 우선입니다.</li><li>최종 순위는 선택된 제출의 Private RMSE 기준입니다. 반올림 전 점수로 순위를 정하므로 화면에 표시된 점수가 같아도 순위가 다를 수 있습니다.</li><li>시상은 개인 리더보드를 바탕으로 조별 최고 성적을 기준으로 운영진이 별도 판별합니다. RMSE는 낮을수록 좋은 성적입니다.</li></ul></section>
        </>}

        {page === "submit" && <>
            <div className="arena-section-heading"><h2>예측 CSV 제출</h2><span className="arena-quota">{eligible ? `오늘 ${info?.remaining_today ?? '—'} / ${info?.daily_limit ?? '—'}회 남음` : '로그인 후 제출 가능'}</span></div>
            {eligible && info?.phase === "open" && info.remaining_today === 0 && <p className="arena-notice arena-neutral">오늘 제출 기회를 모두 사용했습니다. 대회 진행 기간이 이어지면 다음 KST 자정에 제출 기회가 갱신됩니다.</p>}
            <div className="arena-submit-grid"><form className="arena-upload-form" onSubmit={send}><div className="arena-upload"><FileUp size={30} aria-hidden="true" /><label htmlFor="arena-upload-file">예측 결과 CSV를 선택하세요</label><p className="arena-muted">필수 열 2개 · ID {(info?.test_rows || 10213).toLocaleString()}개 · 최대 5MB</p><input ref={inputRef} id="arena-upload-file" type="file" accept=".csv,text/csv" disabled={!canSubmit} onChange={chooseFile} /><p className="arena-filename">{file ? `${file.name} · ${(file.size / 1000).toFixed(1)}KB` : '선택한 파일이 없습니다.'}</p></div>{uploadBusy && <div role="status" aria-live="polite"><progress max={100} value={progress} aria-label="파일 업로드 진행률" /><p>{uploadStage === "uploading" ? `업로드 중 · ${progress}%` : '서버에서 CSV 형식을 확인하고 있습니다…'}</p></div>}<div className="arena-upload-actions"><p className="arena-muted">ID 순서는 달라도 됩니다.<br />형식 오류는 제출 횟수에 포함하지 않습니다.</p><button className="arena-button arena-primary" type="submit" disabled={!canSubmit || !file}>{uploadBusy ? '처리 중…' : '제출하기'} <ArrowRight size={16} aria-hidden="true" /></button></div></form><section className="arena-card"><h3>제출 형식</h3><pre>reservation_id,adr{"\n"}&lt;Test의 실제 ID&gt;,118.40{"\n"}&lt;Test의 실제 ID&gt;,92.75</pre><p className="arena-muted">sample_submission.csv의 ID를 유지하고 adr을 예측값으로 바꾸세요. 모든 Test ID가 정확히 한 번씩 있어야 합니다.</p><ul className="arena-format-rules"><li>필수 헤더는 reservation_id, adr이며 추가 열은 허용하지 않습니다.</li><li>ID는 문자열 그대로 사용하세요. 중복·누락·미등록 ID는 접수되지 않습니다.</li><li>빈 예측, NaN, Infinity, 비수치 값은 허용하지 않습니다. 음수인 유한 예측은 그대로 평가합니다.</li><li>UTF-8 또는 UTF-8 BOM CSV를 지원합니다.</li></ul></section></div>
            <section className="arena-section"><div className="arena-section-heading"><h2>최근 제출</h2><NavLink to="/arena/submissions">내 제출 전체 보기 →</NavLink></div>{eligible ? records(history.results.slice(0, 3), true) : <p className="arena-muted">로그인하면 내 제출 기록을 확인할 수 있습니다.</p>}</section>
        </>}

        {page === "leaderboard" && <>
            <div className="arena-section-heading"><h2><Trophy size={21} aria-hidden="true" /> {info?.phase === 'finalized' ? '최종 리더보드' : 'Public 리더보드'}</h2><span className="arena-muted">RMSE ↓</span></div>
            <p className="arena-muted">{info?.phase === 'finalized' ? '선택된 제출의 Private RMSE 기준 최종 순위입니다.' : '회원별 가장 낮은 Public RMSE를 표시합니다. 최종 순위는 선택한 제출의 Private 점수로 결정됩니다.'}</p>
            {eligible ? leaderboard?.results.length ? <table className="arena-leaderboard"><thead><tr><th>순위</th><th>공개 닉네임</th><th className="arena-number">{leaderboard.metric === 'private_rmse' ? 'Private' : 'Public'} RMSE</th><th className="arena-desktop-time">접수 시각 (KST)</th></tr></thead><tbody>{leaderboard.results.map(row => <tr key={row.rank} className={row.is_me ? 'arena-my-row' : ''}><td>{row.rank}</td><td><strong>{row.public_name}</strong>{row.is_me && <span className="arena-me">나</span>}<time className="arena-mobile-time" dateTime={row.accepted_at}>{dateTime(row.accepted_at)} KST</time></td><td className="arena-number">{score(row.score)}</td><td className="arena-desktop-time"><time dateTime={row.accepted_at}>{dateTime(row.accepted_at)}</time></td></tr>)}</tbody></table> : <div className="arena-empty"><Trophy size={26} aria-hidden="true" /><h3>{info?.phase === 'preparing' ? '아직 대회가 열리지 않았습니다.' : info?.phase === 'finalized' ? '최종 평가 대상 제출이 없습니다.' : '아직 채점된 제출이 없습니다.'}</h3><p>채점이 완료되면 순위가 표시됩니다.</p></div> : <div className="arena-empty"><h3>회원 전용 리더보드입니다.</h3><p>로그인하면 순위를 확인할 수 있습니다.</p></div>}
            <p className="arena-award-note">시상은 조별 최고 성적을 기준으로 운영진이 별도 판별합니다.</p>
        </>}

        {page === "submissions" && <>
            <div className="arena-section-heading"><h2>내 제출 기록</h2>{info?.public_name && <span className="arena-quota">{info.public_name}</span>}</div><p className="arena-notice"><Clock3 size={17} aria-hidden="true" /> {info?.phase === 'closed' || info?.phase === 'finalized' ? '마감 시점의 선택을 기준으로 최종 평가합니다. 선택은 변경할 수 없습니다.' : '최종 평가용 제출 한 건을 선택하세요. 선택하지 않으면 가장 낮은 Public RMSE 제출이 자동 선택됩니다.'}</p>
            {eligible ? <>{records(history.results)}{history.pages > 1 && <div className="arena-pagination"><button type="button" className="arena-button" disabled={history.page <= 1} onClick={() => setHistoryPage(history.page - 1)}>이전</button><span>{history.page} / {history.pages}</span><button type="button" className="arena-button" disabled={history.page >= history.pages} onClick={() => setHistoryPage(history.page + 1)}>다음</button></div>}</> : <p className="arena-muted">로그인하면 내 제출 기록과 최종 선택을 확인할 수 있습니다.</p>}
        </>}
    </div>;
}
