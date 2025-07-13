import React, { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import "./Signup.css";

const Signup: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [emailCode, setEmailCode] = useState("");
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    // 1. 이메일 인증코드 요청
    const handleSendCode = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 이메일 유효성 검사 및 코드 발송 로직 구현
        setStep(2);
    };

    // 2. 이메일 코드 인증
    const handleVerifyCode = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 입력한 코드가 맞는지 검증하는 로직 구현
        // 인증 성공 시 아래 두 줄 실행
        setIsEmailVerified(true);
        setStep(3);
    };

    // 3. 최종 회원가입
    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 회원가입 처리 로직 (이메일, 아이디, 비밀번호)
        // 회원가입 성공 시 /signin 으로 이동
        navigate("/signin");
    };

    return (
        <div className="signup-wrapper">
            <div className="signup-container">
                <div className="signin-title-row">
                {/*  css 간소화를 위해 Signin.tsx 와 통일, Signin.css 참고  */}
                <Link to="/" className="signin-logo">JBIG</Link>
                <h2 className="signin-title">회원가입</h2>
                </div>

                {/* Step 1: 이메일 입력 */}
                {step === 1 && (
                    <>
                        <form className="signup-form" onSubmit={handleSendCode}>
                            <label className="signup-label" htmlFor="email">이메일</label>
                            <input
                                className="signup-input"
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <button className="signup-button" type="submit">인증코드 보내기</button>
                        </form>
                        <div className="signin-links">
                            {/* css 간소화를 위해 signin-links 로 통일, Signin.css 참고 */}
                            <a href="/signin" className="signin-link">로그인하기</a>
                        </div>
                    </>
                )}

                {/* Step 2: 이메일 인증코드 입력 */}
                {step === 2 && (
                    <form className="signup-form" onSubmit={handleVerifyCode}>
                        <div className="signup-desc">
                            이메일로 발송된 인증코드를 입력하세요.
                        </div>
                        <input
                            className="signup-input"
                            type="text"
                            placeholder="인증코드"
                            value={emailCode}
                            onChange={e => setEmailCode(e.target.value)}
                            required
                        />
                        <button className="signup-button" type="submit">인증</button>
                    </form>
                )}

                {/* Step 3: 아이디, 비밀번호 입력 */}
                {step === 3 && isEmailVerified && (
                    <form className="signup-form" onSubmit={handleSignup}>
                        <label className="signup-label" htmlFor="userId">아이디</label>
                        <input
                            className="signup-input"
                            id="userId"
                            type="text"
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            required
                        />
                        <label className="signup-label" htmlFor="password">비밀번호</label>
                        <input
                            className="signup-input"
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <button className="signup-button" type="submit">회원가입</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Signup;
