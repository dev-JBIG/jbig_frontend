    import React, { useState } from "react";
    import "./Signin.css";
    import {Link, useNavigate} from "react-router-dom";
    import {signin} from "../../API/req";
    import {useUser} from "../Utils/UserContext";
    import {useStaffAuth} from "../Utils/StaffAuthContext";

    const isValidEmailDomain = (email: string) => /@jbnu\.ac\.kr$/i.test(email.trim());
    // 8~16자, 영문/숫자 각 1개 이상, 특수문자 ! 또는 @ 최소 1개 포함
    const isValidPassword = (pwd: string) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

    const Signin: React.FC = () => {
        const [userId, setUserId] = useState("");
        const [password, setPassword] = useState("");
        const [showPassword, setShowPassword] = useState(false);

        const navigate = useNavigate();
        const { setAuth } = useUser();
        const { setStaffAuth } = useStaffAuth();

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!isValidEmailDomain(userId.trim())) {
                alert("전북대 이메일(@jbnu.ac.kr)만 사용할 수 있습니다.");
                return;
            }
            if (!isValidPassword(password.trim())) {
                alert("비밀번호는 8~16자이며, 영문/숫자 각 1개 이상과 특수문자(!,@)를 포함해야 합니다.");
                return;
            }

            try {
                const result = await signin(userId, password);
                if (result.access && result.username && result.semester) {
                    setAuth(
                        {
                            username: result.username,
                            semester: result.semester,
                            email: userId,
                        },
                        result.access,
                        result.refresh
                    );
                    setStaffAuth(!!result.is_staff);

                    navigate("/");
                } else {
                    alert(result.message || "로그인에 실패했습니다.");
                }
            } catch (error) {
                alert("로그인 요청 중 오류가 발생했습니다.");
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
                            className="signin-input"
                            id="userid"
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                        <label className="signin-label" htmlFor="password">
                            비밀번호
                        </label>
                        <div className="signin-password-row">
                            <input
                                className="signin-input"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <span
                                className="signin-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                            {showPassword ? "숨기기" : "보이기"}
                        </span>
                        </div>

                        <button className="signin-button" type="submit">
                            로그인
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
