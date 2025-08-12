import React, { useState } from "react";
import "./Signin.css";
import {Link, useNavigate} from "react-router-dom";
import {signin} from "../../API/req";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";

const Signin: React.FC = () => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();
    const { setAuth } = useUser();
    const { setStaffAuth } = useStaffAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    <input
                        className="signin-input"
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button className="signin-button" type="submit">
                        로그인
                    </button>
                </form>
                <div className="signin-links">
                <a href="/signup" className="signin-link">가입하기</a>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a href="#" className="signin-link">비밀번호를 잊어버리셨나요?</a>
                    {/*  todo: 비밀번호 찾기  */}
                </div>
            </div>
        </div>
    );
};

export default Signin;
