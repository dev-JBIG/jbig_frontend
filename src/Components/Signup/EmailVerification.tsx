import React, { useEffect, useRef, useState } from "react";
import { resendVerifyEmail, verifyAuthEmail } from "../../API/req";
import "./Signup.css";
import "./EmailVerification.css";

interface Props {
    email: string;
    initialExpiresAt?: number | null;
    onVerified: () => void;
    onBack?: () => void;
}

const EmailVerification: React.FC<Props> = ({ email, initialExpiresAt = null, onVerified, onBack }) => {
    const [code, setCode] = useState("");
    const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
    const [now, setNow] = useState(Date.now());
    const [busy, setBusy] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const inFlight = useRef(false);

    useEffect(() => {
        if (expiresAt === null) return;
        const tick = () => setNow(Date.now());
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    const secondsLeft = expiresAt === null ? null : Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const disabled = busy || completed;

    const request = async (resend: boolean) => {
        if (inFlight.current || completed) return;
        inFlight.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const result = resend ? await resendVerifyEmail(email) : await verifyAuthEmail(email, code.trim());
            if (!result.success) {
                setError(result.status === 429
                    ? "요청이 많습니다. 잠시 후 다시 시도해주세요."
                    : result.message || "요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
                return;
            }
            if (resend) {
                const sentAt = Date.now();
                setNow(sentAt);
                setExpiresAt(sentAt + 300000);
                setCode("");
                setNotice("인증이 필요한 계정이라면 인증 메일이 재전송되었습니다. 메일함과 스팸함을 확인해주세요.");
            } else {
                setCompleted(true);
                setCode("");
                onVerified();
            }
        } catch {
            setError("요청 중 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.");
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    };

    return (
        <form className="signup-form email-verification" onSubmit={e => { e.preventDefault(); void request(false); }}>
            <div className="signup-desc">
                이메일(<strong>{email}</strong>)로 받은 인증코드를 입력하세요.
                메일을 받지 못했거나 코드가 만료되었다면 재전송해주세요.
            </div>
            <div className="verification-timer-row">
                {secondsLeft === null ? (
                    <span>기존 코드의 남은 시간은 확인할 수 없습니다.</span>
                ) : (
                    <span aria-label="인증코드 남은 시간" className={secondsLeft <= 60 ? "verification-expiring" : ""}>
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                )}
                <button type="button" className="verification-resend" disabled={disabled} onClick={() => void request(true)}>
                    재전송
                </button>
            </div>
            {secondsLeft === 0 && <div>안내 시간이 지났습니다. 코드가 만료되었다면 재전송해주세요.</div>}
            <label className="signup-label" htmlFor="verification-code">인증코드</label>
            <input
                id="verification-code"
                className="signup-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="인증코드"
                value={code}
                onChange={e => setCode(e.target.value)}
                disabled={disabled}
                required
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            {notice && <div role="status">{notice}</div>}
            <button className="signup-button" type="submit" disabled={disabled}>
                {busy ? "처리 중..." : "이메일 인증하기"}
            </button>
            {onBack && <button type="button" className="verification-resend" disabled={disabled} onClick={onBack}>로그인 입력으로 돌아가기</button>}
        </form>
    );
};

export default EmailVerification;
