import React, { useState } from "react";
import "./LoginModal.css";
import { signin } from "../../API/req";
import { useUser } from "./UserContext";
import { useStaffAuth } from "./StaffAuthContext";
import { useNavigate } from "react-router-dom";
import { useJbnuEmail } from "./useJbnuEmail";

interface LoginModalProps {
    onClose: () => void;
}

const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
const isValidPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    const { email: userId, inputRef: userIdRef, onChange: onUserIdChange, onFocus: onUserIdFocus, onClick: onUserIdClick } = useJbnuEmail();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { setAuth } = useUser();
    const { setStaffAuth } = useStaffAuth();

    const validateEmail = (value: string) => {
        if (!value.trim()) return "이메일을 입력해주세요.";
        if (!isValidEmailDomain(value)) return "전북대 이메일(@jbnu.ac.kr)만 사용할 수 있습니다.";
        return undefined;
    };

    const validatePassword = (value: string) => {
        if (!value) return "비밀번호를 입력해주세요.";
        if (!isValidPassword(value)) return "8~16자, 영문/숫자 각 1개 이상, 특수문자(!,@) 포함";
        return undefined;
    };

    const handleEmailBlur = () => {
        const err = validateEmail(userId);
        setFieldErrors(prev => ({ ...prev, email: err }));
    };

    const handlePasswordBlur = () => {
        const err = validatePassword(password);
        setFieldErrors(prev => ({ ...prev, password: err }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const emailErr = validateEmail(userId);
        const pwdErr = validatePassword(password);

        if (emailErr || pwdErr) {
            setFieldErrors({ email: emailErr, password: pwdErr });
            return;
        }

        setLoading(true);
        try {
            const result = await signin(userId, password);
            if (result.access && result.username && result.semester) {
                setAuth(
                    {
                        username: result.username,
                        semester: result.semester,
                        email: userId,
                        is_staff: !!result.is_staff,
                    },
                    result.access,
                    result.refresh
                );
                setStaffAuth(!!result.is_staff);
                onClose();
                // 새로고침 대신 홈으로 이동 (이미 홈이면 그대로)
                if (window.location.pathname !== '/') {
                    navigate('/');
                }
            } else {
                setError(result.message || "로그인에 실패했습니다.");
            }
        } catch {
            setError("로그인 요청 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSignupClick = () => {
        onClose();
        navigate("/signup");
    };

    const handleForgotPasswordClick = () => {
        onClose();
        navigate("/changepwd");
    };

    return (
        <div className="login-modal-backdrop" onClick={handleBackdropClick}>
            <div className="login-modal-container">
                <button className="login-modal-close" onClick={onClose}>
                    &times;
                </button>
                <div className="login-modal-header">
                    <h2 className="login-modal-title">로그인</h2>
                </div>
                <form className="login-modal-form" onSubmit={handleSubmit}>
                    <label className="login-modal-label" htmlFor="modal-userid">
                        아이디 (이메일)
                    </label>
                    <input
                        ref={userIdRef}
                        className={`login-modal-input ${fieldErrors.email ? "input-error" : ""}`}
                        id="modal-userid"
                        type="text"
                        value={userId}
                        onChange={(e) => {
                            onUserIdChange(e);
                            if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        onFocus={onUserIdFocus}
                        onClick={onUserIdClick}
                        onBlur={handleEmailBlur}
                        autoFocus
                    />
                    {fieldErrors.email && <span className="login-modal-field-error">{fieldErrors.email}</span>}

                    <label className="login-modal-label" htmlFor="modal-password">
                        비밀번호
                    </label>
                    <div className="login-modal-password-row">
                        <input
                            className={`login-modal-input ${fieldErrors.password ? "input-error" : ""}`}
                            id="modal-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                            }}
                            onBlur={handlePasswordBlur}
                        />
                        <span
                            className="login-modal-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? "숨기기" : "보이기"}
                        </span>
                    </div>
                    {fieldErrors.password && <span className="login-modal-field-error">{fieldErrors.password}</span>}

                    {error && <div className="login-modal-error">{error}</div>}

                    <button className="login-modal-button" type="submit" disabled={loading}>
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>
                <div className="login-modal-links">
                    <button className="login-modal-link" onClick={handleSignupClick}>
                        가입하기
                    </button>
                    <button className="login-modal-link" onClick={handleForgotPasswordClick}>
                        비밀번호를 잊어버리셨나요?
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
