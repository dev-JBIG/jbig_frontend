import React, { useState, useEffect } from "react";
import "./ChangePWD.css";
import { Link, useNavigate } from "react-router-dom";
import { requestVerificationCode, verifyCode, resetPassword } from "../../API/req";
import { useUser } from "../Utils/UserContext";
import { useStaffAuth } from "../Utils/StaffAuthContext";
import { useAlert } from "../Utils/AlertContext";

// 이메일 도메인 유효성 검사
const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
// 8~16자, 영문/숫자 각 1개 이상, 특수문자 ! 또는 @ 최소 1개 포함
const isValidPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

const ChangePWD: React.FC = () => {
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isCodeVerified, setIsCodeVerified] = useState(false);
    const [timer, setTimer] = useState(300); // 5분 = 300초
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { signOutLocal } = useUser();
    const { setStaffAuth } = useStaffAuth();
    const { showAlert } = useAlert();

    // 타이머 로직
    useEffect(() => {
        if (!isCodeSent || isCodeVerified) return;

        const expireAt = Date.now() + 300 * 1000; // 현재 시각 + 5분

        const intervalId = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
            setTimer(remaining);

            if (remaining === 0) {
                clearInterval(intervalId);
                showAlert({ message: "인증코드 유효시간이 만료되었습니다. 다시 요청해주세요.", type: 'warning' });
                setIsCodeSent(false);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isCodeSent, isCodeVerified]);


    // 1. 인증코드 요청 핸들러
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidEmailDomain(email.trim())) {
            showAlert({ message: "전북대 이메일(@jbnu.ac.kr)만 사용할 수 있습니다.", type: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await requestVerificationCode(email);
            if (result.success) {
                showAlert({ message: "인증코드가 발송되었습니다. 이메일을 확인해주세요.", type: 'success' });
                setIsCodeSent(true);
                setTimer(300); // 타이머 초기화
            } else {
                showAlert({ message: result.message || "인증코드 발송에 실패했습니다.", type: 'error' });
            }
        } catch (error) {
            showAlert({ message: "인증코드 요청 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // 2. 인증코드 확인 핸들러
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode.trim()) {
            showAlert({ message: "인증코드를 입력해주세요.", type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await verifyCode(email, verificationCode);
            if (result.success) {
                showAlert({ message: "인증되었습니다. 새 비밀번호를 입력해주세요.", type: 'success' });
                setIsCodeVerified(true);
            } else {
                showAlert({ message: result.message || "인증에 실패했습니다.", type: 'error' });
            }
        } catch (error) {
            showAlert({ message: "인증코드 확인 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // 3. 새 비밀번호 설정 핸들러
    const handleSubmitNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidPassword(newPassword)) {
            showAlert({ message: "비밀번호는 8~16자이며, 영문/숫자 각 1개 이상과 특수문자(!,@)를 포함해야 합니다.", type: 'warning' });
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert({ message: "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.", type: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await resetPassword(email, newPassword, confirmPassword);
            if (result.success) {
                // 비밀번호 변경 성공 시 로그아웃 처리함
                signOutLocal();
                setStaffAuth(false);
                showAlert({
                    message: "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.",
                    type: 'success',
                    onClose: () => navigate("/signin")
                });
            } else {
                showAlert({ message: result.message || "비밀번호 변경에 실패했습니다.", type: 'error' });
            }
        } catch (error) {
            showAlert({ message: "비밀번호 변경 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="changepwd-wrapper">
            <div className="changepwd-container">
                <div className="changepwd-title-row">
                    <Link to="/" className="changepwd-logo">JBIG</Link>
                    <h2 className="changepwd-title">비밀번호 찾기</h2>
                </div>

                {/* 1단계: 이메일 입력 */}
                {!isCodeSent && (
                    <form className="changepwd-form" onSubmit={handleRequestCode}>
                        <label className="changepwd-label" htmlFor="email">
                            아이디
                        </label>
                        <input
                            className="changepwd-input"
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="예: jbig@jbnu.ac.kr"
                            disabled={isLoading}
                        />
                        <button className="changepwd-button" type="submit" disabled={isLoading}>
                            {isLoading ? "전송 중..." : "인증코드 받기"}
                        </button>
                    </form>
                )}

                {/* 2단계: 인증코드 입력 */}
                {isCodeSent && !isCodeVerified && (
                    <form className="changepwd-form" onSubmit={handleVerifyCode}>
                        <label className="changepwd-label" htmlFor="verificationCode">
                            인증코드
                        </label>
                        <div className="changepwd-code-row">
                            <input
                                className="changepwd-input"
                                id="verificationCode"
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="이메일로 받은 인증코드를 입력하세요"
                                disabled={isLoading}
                            />
                            <span className="changepwd-timer" style={{color: timer <= 60 ? "red" : "black"}}>
                                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
                            </span>
                        </div>

                        <button className="changepwd-button" type="submit" disabled={isLoading}>
                            {isLoading ? "확인 중..." : "인증코드 확인"}
                        </button>
                    </form>
                )}

                {/* 3단계: 새 비밀번호 입력 */}
                {isCodeVerified && (
                    <form className="changepwd-form" onSubmit={handleSubmitNewPassword}>
                        <label className="changepwd-label" htmlFor="newPassword">
                            새 비밀번호
                        </label>
                        <input
                            className="changepwd-input"
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="영문, 숫자, 특수문자(!@) 포함 8~16자"
                            disabled={isLoading}
                        />
                        <label className="changepwd-label" htmlFor="confirmPassword">
                            새 비밀번호 확인
                        </label>
                        <input
                            className="changepwd-input"
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호를 다시 한번 입력하세요"
                            disabled={isLoading}
                        />
                        <button className="changepwd-button" type="submit" disabled={isLoading}>
                            {isLoading ? "변경 중..." : "비밀번호 변경"}
                        </button>
                    </form>
                )}

                <div className="changepwd-links">
                    <Link to="/signin" className="changepwd-link">로그인하기</Link>
                </div>
            </div>
        </div>
    );
};

export default ChangePWD;
