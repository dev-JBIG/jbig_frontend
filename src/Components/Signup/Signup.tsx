import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser, verifyAuthEmail, resendVerifyEmail } from "../../API/req";
import { useAlert } from "../Utils/AlertContext";
import "./Signup.css";

const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
const isValidSemester = (n: number) => Number.isInteger(n) && n >= 1 && n < 100;
// 8~16자, 영문/숫자 각 1개 이상, 특수문자 ! 또는 @ 최소 1개 포함
const isValidPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

const Signup: React.FC = () => {
    // 단계: 1) 정보 입력/회원가입 요청(인증코드 발송) -> 2) 이메일 인증 코드 검증
    const [step, setStep] = useState<1 | 2>(1);

    // 1단계 입력값
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [semester, setSemester] = useState<number | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // 2단계 입력값
    const [emailCode, setEmailCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0); // ← 5분 타이머(초)

    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // 타이머 진행
    useEffect(() => {
        if (step !== 2) return;

        const expireAt = Date.now() + 300 * 1000; // 현재 시각 + 5분

        const t = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (remaining === 0) clearInterval(t);
        }, 1000);

        return () => clearInterval(t);
    }, [step]);

    // 1단계: 회원가입 요청 -> 서버가 인증코드 이메일 발송
    const handleSignupRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        const trimmedEmail = email.trim();
        const trimmedUserId = userId.trim();
        const trimmedPwd = password.trim();

        // 검증
        if (!isValidEmailDomain(trimmedEmail)) {
            showAlert({ message: "전북대 이메일(@jbnu.ac.kr)만 사용할 수 있습니다.", type: 'warning' });
            return;
        }
        if (!trimmedUserId) {
            showAlert({ message: "아이디(유저명)를 입력해주세요.", type: 'warning' });
            return;
        }
        if (semester === null || !isValidSemester(semester)) {
            showAlert({ message: "부적절한 기수 입니다.", type: 'warning' });
            return;
        }
        if (!isValidPassword(trimmedPwd)) {
            showAlert({ message: "비밀번호는 8~16자이며, 영문/숫자 각 1개 이상과 특수문자(!,@)를 포함해야 합니다.", type: 'warning' });
            return;
        }
        if (password !== confirmPassword) {
            showAlert({ message: "비밀번호 확인이 일치하지 않습니다.", type: 'warning' });
            return;
        }

        try {
            setLoading(true);
            const result = await signupUser(trimmedEmail, trimmedUserId, semester, password);
            if (result.success) {
                setStep(2);
                setSecondsLeft(300);
            } else {
                showAlert({ message: result?.message || "회원가입 요청에 실패했습니다.", type: 'error' });
            }
        } catch {
            showAlert({ message: "회원가입 요청 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // 2단계: 이메일 인증 코드 검증 -> 성공 시 가입 완료로 간주
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await verifyAuthEmail(email.trim(), emailCode.trim());
            if (result.success || result.status === 200) {
                showAlert({
                    message: "운영진 승인 이후 회원가입이 완료됩니다.",
                    type: 'success',
                    onClose: () => navigate("/")
                });
            } else {
                showAlert({ message: result.message || "인증 코드가 올바르지 않습니다.", type: 'error' });
            }
        } catch {
            showAlert({ message: "인증 요청 중 오류가 발생했습니다.", type: 'error' });
        }
    };

    // 인증코드 재전송
    const handleResendCode = async () => {
        if (loading) return;
        try {
            setLoading(true);
            const res = await resendVerifyEmail(email.trim());
            if (res.success) {
                showAlert({ message: "인증 메일이 재전송되었습니다.", type: 'success' });
                setSecondsLeft(300);
            } else {
                showAlert({ message: res.message || "재전송에 실패했습니다.", type: 'error' });
            }
        } catch {
            showAlert({ message: "인증 메일 재전송 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-wrapper">
            <div className="signup-container">
                <div className="signin-title-row">
                    <Link to="/" className="signin-logo">JBIG</Link>
                    <h2 className="signin-title">회원가입</h2>
                </div>

                {step === 1 && (
                    <>
                        <form className="signup-form" onSubmit={handleSignupRequest}>
                            <label className="signup-label" htmlFor="email">이메일</label>
                            <input
                                className="signup-input"
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="예: example@jbnu.ac.kr"
                            />

                            <label className="signup-label" htmlFor="userId">이름</label>
                            <input
                                className="signup-input"
                                id="userId"
                                type="text"
                                value={userId}
                                placeholder="예: 홍길동"
                                onChange={(e) => setUserId(e.target.value)}
                                required
                            />

                            <label className="signup-label" htmlFor="semester">기수 (숫자)</label>
                            <input
                                className="signup-input"
                                id="semester"
                                type="number"
                                min={1}
                                max={99}
                                value={semester ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setSemester(v === "" ? null : Number(v));
                                }}
                                required
                            />

                            <label className="signup-label" htmlFor="password">
                                비밀번호
                            </label>
                            <div style={{position: "relative", width: "100%"}}>
                                <input
                                    className="signup-input"
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    placeholder="숫자 + 영문 + !,@"
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    style={{
                                        position: "absolute",
                                        right: "8px",
                                        top: "38%",
                                        transform: "translateY(-50%)",
                                        background: "rgba(255,255,255,0.7)",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#3563e9",
                                        fontSize: "12px",
                                        zIndex: 2,
                                    }}
                                >
                                    {showPassword ? "숨기기" : "보이기"}
                                </button>
                            </div>
                            <label className="signup-label" htmlFor="confirmPassword">
                                비밀번호 확인
                            </label>
                            <input
                                className="signup-input"
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="숫자 + 영문 + !,@"
                            />

                            <button className="signup-button" type="submit" disabled={loading}>인증코드 받기</button>
                        </form>

                        <div className="signin-links">
                            <a href="/signin" className="signin-link">로그인하기</a>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <form className="signup-form" onSubmit={handleVerifyCode}>
                        <div className="signup-desc">
                            이메일(<strong>{email}</strong>)로 발송된 인증코드를 입력하세요.
                        </div>

                        {/* 타이머 표시 & 재전송 버튼 */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10,
                            }}
                        >
                            <span style={{color: secondsLeft <= 60 ? "red" : "black"}}>
                                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                            </span>
                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={loading}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#3563e9",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    textDecoration: "underline",
                                }}
                            >
                                재전송
                            </button>
                        </div>


                        <input
                            className="signup-input"
                            type="text"
                            placeholder="인증코드"
                            value={emailCode}
                            onChange={e => setEmailCode(e.target.value)}
                            required
                        />
                        <button className="signup-button" type="submit">이메일 인증하기</button>
                    </form>
                )}
            </div>
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <div className="loading-text">처리 중...</div>
                </div>
            )}

        </div>
    );
};

export default Signup;
