import React, { useState } from "react";
import "./Signin.css";
import {Link, useNavigate} from "react-router-dom";
import {signin} from "../../API/req";

const Signin: React.FC = () => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await signin(userId, password);
            if (result.access && result.username && result.semester) {
                localStorage.setItem("jbig-accessToken", result.access);
                localStorage.setItem("jbig-username", result.username);
                localStorage.setItem("jbig-semester", result.semester);
                localStorage.setItem("jbig-refresh", result.refresh);
                localStorage.setItem("jbig-email", userId);

                navigate("/"); // 원하는 페이지로 이동
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
