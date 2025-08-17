import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, signout } from "../../API/req";
import { useUser } from "../Utils/UserContext";
import "./ChangePWD.css";

const ChangePWD: React.FC = () => {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [newPw2, setNewPw2] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // 👈 토글 상태

    const { accessToken, signOutLocal, refreshToken } = useUser();
    const navigate = useNavigate();

    const isValidPassword = (pwd: string) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@])[A-Za-z\d!@]{8,16}$/.test(pwd);

    const handleChangePassword = async () => {
        if (!currentPw || !newPw || !newPw2) {
            alert("모든 항목을 입력하세요.");
            return;
        }
        if (newPw !== newPw2) {
            alert("새 비밀번호가 서로 다릅니다.");
            return;
        }
        if (!isValidPassword(newPw)) {
            alert("비밀번호는 8~16자이며, 영문/숫자 각 1개 이상과 특수문자(!,@)를 포함해야 합니다.");
            return;
        }

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        setLoading(true);
        const result = await changePassword(currentPw, newPw, newPw2, accessToken);
        setLoading(false);

        if (result.success) {
            alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
            if (accessToken && refreshToken) {
                await signout(accessToken, refreshToken);
            }
            signOutLocal();
            navigate("/signin");
        } else {
            alert(result.message || "비밀번호 변경에 실패했습니다.");
        }
    };

    return (
        <div className="pwchange-wrapper">
            <div className="pwchange-form">
                <div className="pwchange-info">
                    비밀번호 변경은 하루 <strong>1회</strong>만 가능합니다.
                </div>

                {/* 기존 비밀번호 (보이기/숨기기 버튼 붙임) */}
                <div className="pwchange-input-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        disabled={loading}
                        placeholder="기존 비밀번호"
                    />
                    <button
                        type="button"
                        className="pwchange-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? "숨기기" : "보이기"}
                    </button>
                </div>

                {/* 새 비밀번호들 (토글 상태 공유) */}
                <input
                    type={showPassword ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    disabled={loading}
                    placeholder="새 비밀번호"
                />

                <input
                    type={showPassword ? "text" : "password"}
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    disabled={loading}
                    placeholder="새 비밀번호 확인"
                />

                <button onClick={handleChangePassword} disabled={loading}>
                    {loading ? "변경 중..." : "비밀번호 변경하기"}
                </button>
            </div>
        </div>
    );
};

export default ChangePWD;
