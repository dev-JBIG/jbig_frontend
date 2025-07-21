import React, { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import {sendAuthEmail, signupUser, verifyAuthEmail} from "../../API/req"
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
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await sendAuthEmail(email);
            if (result.duplicateMail) {
                alert("이미 가입된 이메일입니다.");
            } else {
                alert("인증 메일을 보냈습니다!");
                setStep(2);
            }
        } catch (e) {
            alert("요청에 실패했습니다.");
        }
    };

    // 2. 이메일 코드 인증
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await verifyAuthEmail(email, emailCode);
            if (result.success || result.verified) { // 응답 필드명에 따라 수정!
                setIsEmailVerified(true);
                setStep(3);
            } else {
                alert("인증 코드가 올바르지 않습니다.");
            }
        } catch (error) {
            alert("인증 요청에 실패했습니다.");
        }
    };

    // 3. 최종 회원가입
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await signupUser(email, userId, password); // email, userId, password는 입력받은 값

            if (result.success || result.ok || result.code === 201) {
                alert("회원가입이 완료되었습니다! 로그인해주세요.");
                navigate("/signin");
            } else {
                alert(result.message || "회원가입에 실패했습니다.");
            }
        } catch (error) {
            alert("회원가입 요청에 실패했습니다.");
        }
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
