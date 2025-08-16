import React, { useState } from "react";
import { requestPasswordChangeCode } from "../../API/req";
// import { requestPasswordChangeCode, verifyPasswordChangeCode, completePasswordChange } from "../../API/req";
import "./ChangePWD.css";

const ChangePWD: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [newPw2, setNewPw2] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // 1단계: 이메일 입력 후 코드 발송
    const handleSendCode = async () => {
        setError("");
        setSuccess("");
        if (!email) {
            setError("이메일을 입력하세요.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("올바른 이메일 주소를 입력하세요.");
            return;
        }
        if (!email.endsWith("@jbnu.ac.kr")) {
            setError("전북대 이메일(@jbnu.ac.kr)만 사용 가능합니다.");
            return;
        }

        setLoading(true);
        const ok = await requestPasswordChangeCode(email);
        setLoading(false);
        if (ok) {
            setSuccess("인증 코드가 이메일로 발송되었습니다.");
            setStep(2);
        } else {
            setError("코드 발송에 실패했습니다.");
        }
    };

    // 2단계: 인증 코드 검증
    const handleVerifyCode = async () => {
        setError("");
        setSuccess("");
        if (!code) {
            setError("인증 코드를 입력하세요.");
            return;
        }
        setLoading(true);
        // const ok = await verifyPasswordChangeCode(email, code);
        // setLoading(false);
        // if (ok) {
        //     setSuccess("이메일 인증이 완료되었습니다.");
        //     setStep(3);
        // } else {
        //     setError("인증 코드가 올바르지 않습니다.");
        // }
    };

    // 3단계: 비밀번호 변경
    const handleChangePassword = async () => {
        setError("");
        setSuccess("");

        if (!currentPw || !newPw || !newPw2) {
            setError("모든 항목을 입력하세요.");
            return;
        }
        if (newPw !== newPw2) {
            setError("새 비밀번호가 서로 다릅니다.");
            return;
        }
        if (newPw.length < 8) {
            setError("비밀번호는 8자 이상이어야 합니다.");
            return;
        }

        setLoading(true);
        // const ok = await completePasswordChange(email, code, currentPw, newPw);
        // setLoading(false);
        // if (ok) {
        //     setSuccess("비밀번호가 성공적으로 변경되었습니다.");
        //     setStep(1);
        //     setEmail("");
        //     setCode("");
        //     setCurrentPw("");
        //     setNewPw("");
        //     setNewPw2("");
        // } else {
        //     setError("비밀번호 변경에 실패했습니다.");
        // }
    };

    return (
        <div className="pwchange-wrapper">
            {step === 1 && (
                <div className="pwchange-step">
                    <label>이메일</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <button onClick={handleSendCode} disabled={loading}>
                        {loading ? "발송 중..." : "인증 코드 받기"}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="pwchange-step">
                    <label>인증 코드</label>
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        disabled={loading}
                    />
                    <button onClick={handleVerifyCode} disabled={loading}>
                        {loading ? "확인 중..." : "코드 확인"}
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="pwchange-step">
                    <label>현재 비밀번호</label>
                    <input
                        type="password"
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        disabled={loading}
                    />

                    <label>새 비밀번호</label>
                    <input
                        type="password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        disabled={loading}
                    />

                    <label>새 비밀번호 확인</label>
                    <input
                        type="password"
                        value={newPw2}
                        onChange={e => setNewPw2(e.target.value)}
                        disabled={loading}
                    />

                    <button onClick={handleChangePassword} disabled={loading}>
                        {loading ? "변경 중..." : "비밀번호 변경하기"}
                    </button>
                </div>
            )}

            {error && <div className="pwchange-error">{error}</div>}
            {success && <div className="pwchange-success">{success}</div>}
        </div>
    );
};

export default ChangePWD;
