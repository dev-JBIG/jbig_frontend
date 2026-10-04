import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../../API/req";
import { useAlert } from "../Utils/AlertContext";
import { useJbnuEmail } from "../Utils/useJbnuEmail";
import "./Signup.css";
import EmailVerification from "./EmailVerification";

const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
const isValidSemester = (n: number) => Number.isInteger(n) && n >= 1 && n < 100;
// 8~16자, 영문/숫자 각 1개 이상, 특수문자 ! 또는 @ 최소 1개 포함
const isValidPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

const Signup: React.FC = () => {
    // 단계: 1) 정보 입력/회원가입 요청(인증코드 발송) -> 2) 이메일 인증 코드 검증
    const [step, setStep] = useState<1 | 2>(1);

    // 1단계 입력값
    const { email, inputRef: emailRef, onChange: onEmailChange, onFocus: onEmailFocus, onClick: onEmailClick } = useJbnuEmail();
    const [userId, setUserId] = useState("");
    const [semester, setSemester] = useState<number | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [expiresAt, setExpiresAt] = useState<number | null>(null);

    const navigate = useNavigate();
    const { showAlert } = useAlert();

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
                setExpiresAt(Date.now() + 300000);
                setPassword("");
                setConfirmPassword("");
            } else {
                showAlert({ message: result?.message || "회원가입 요청에 실패했습니다.", type: 'error' });
            }
        } catch {
            showAlert({ message: "회원가입 요청 중 오류가 발생했습니다.", type: 'error' });
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
                                ref={emailRef}
                                className="signup-input"
                                id="email"
                                type="text"
                                inputMode="email"
                                autoComplete="email"
                                value={email}
                                onChange={onEmailChange}
                                onFocus={onEmailFocus}
                                onClick={onEmailClick}
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
                            <Link to="/signin" className="signin-link">이미 가입을 시도하셨나요? 로그인하여 이메일 인증을 이어가세요.</Link>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <EmailVerification
                        email={email.trim()}
                        initialExpiresAt={expiresAt}
                        onVerified={() => showAlert({
                            message: "회원가입이 완료되었습니다. 로그인해주세요.",
                            type: 'success',
                            onClose: () => navigate("/signin")
                        })}
                    />
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
