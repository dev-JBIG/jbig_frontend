import React, { useState } from "react";
import "./Signin.css";
import {Link, useNavigate} from "react-router-dom";
import {signin} from "../../API/req";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";

const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
const isValidPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

const Signin: React.FC = () => {
    const [userId, setUserId] = useState("");
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
                navigate("/");
            } else {
                setError(result.message || "로그인에 실패했습니다.");
            }
        } catch {
            setError("로그인 요청 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signin-wrapper">
            <div className="signin-container">
                <div className="signin-title-row">
                    <Link to="/" className="signin-logo">JBIG</Link>
                    <h2 className="signin-title">로그인</h2>
                </div>
                <form className="signin-form" onSubmit={handleSubmit}>
                    <label className="signin-label" htmlFor="userid">
                        아이디 (이메일)
                    </label>
                    <input
                        className={`signin-input ${fieldErrors.email ? "input-error" : ""}`}
                        id="userid"
                        type="text"
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value);
                            if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        onBlur={handleEmailBlur}
                    />
                    {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

                    <label className="signin-label" htmlFor="password">
                        비밀번호
                    </label>
                    <div className="signin-password-row">
                        <input
                            className={`signin-input ${fieldErrors.password ? "input-error" : ""}`}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                            }}
                            onBlur={handlePasswordBlur}
                        />
                        <span
                            className="signin-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? "숨기기" : "보이기"}
                        </span>
                    </div>
                    {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

                    {error && <div className="form-error">{error}</div>}

                    <button className="signin-button" type="submit" disabled={loading}>
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>
                <div className="signin-links">
                    <a href="/signup" className="signin-link">가입하기</a>
                    <a href="/changepwd" className="signin-link">비밀번호를 잊어버리셨나요?</a>
                </div>
            </div>
        </div>
    );
};

export default Signin;
