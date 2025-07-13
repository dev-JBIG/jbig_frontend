import React, { useState } from "react";
import "./Signin.css";
import {Link} from "react-router-dom";

const Signin: React.FC = () => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 로그인 로직 구현
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
                        아이디
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
                </div>
            </div>
        </div>
    );
};

export default Signin;
