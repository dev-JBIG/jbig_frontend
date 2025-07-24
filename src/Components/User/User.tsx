import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./User.css";
import PostList from "../Posts/PostList";
import { UserProfile } from "../Utils/interfaces"


const User: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"posts" | "comments" | "changepw">("posts");

    // 내 계정 여부(localStorage 기준)
    const isMe = username === localStorage.getItem("jbig-username");

    useEffect(() => {
        // TODO: 실제 API 연동
        setTimeout(() => {
            setUser({
                username: username || "",
                email: "honggildong@example.com",
                joinDate: "2024-07-01",
                profileImageUrl: "", // 사용자 이미지 추가 검토 필요 todo
                role: "member", // 예시
                totalPosts: 13,
            });
            setLoading(false);
        }, 400);
    }, [username]);

    if (loading) return <div className="user-profile-loading">Loading...</div>;
    if (!user) return <div className="user-profile-empty">User not found.</div>;

    return (
        <div className="user-profile-container">
            <div className="user-profile-header">
                {user.profileImageUrl ? (
                    <img
                        src={user.profileImageUrl}
                        alt="profile"
                        className="user-profile-img"
                    />
                ) : (
                    <div className="user-profile-img user-profile-placeholder" />
                )}
                <div className="user-profile-summary">
                    <div className="user-profile-username">{user.username}</div>
                    <div className="user-profile-role-email">
                        <span className="user-profile-role">{user.role === "admin" ? "관리자" : "멤버"}</span>
                        <span className="user-profile-email">{user.email}</span>
                    </div>
                    <div className="user-profile-joindate">가입일: {user.joinDate}</div>
                    <div className="user-profile-totalposts">총 게시글: {user.totalPosts ?? 0}개</div>
                </div>
            </div>
            <div className="user-profile-tabs">
                <button
                    className={tab === "posts" ? "active" : ""}
                    onClick={() => setTab("posts")}
                >
                    작성글
                </button>
                <button
                    className={tab === "comments" ? "active" : ""}
                    onClick={() => setTab("comments")}
                >
                    댓글 단 글
                </button>
                {/*{isMe && (*/}
                    <button
                        className={tab === "changepw" ? "active" : ""}
                        onClick={() => setTab("changepw")}
                    >
                        비밀번호 변경
                    </button>
                {/*)}*/}
            </div>
            <div className="user-profile-postlist">
                {/* 더미 데이터 보여짐, todo: 사용자 게시물 API 연동*/}
                {tab === "posts" && <PostList />}

                {tab === "comments" && (
                    // TODO: 실제 댓글 단 글 컴포넌트로 변경
                    <div style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>
                        댓글 단 글 목록 (TODO)
                    </div>
                )}

                {/* todo: API 연동 후 하단 조건으로 수정*/}
                {/*{tab === "changepw" && isMe && (*/}
                {tab === "changepw" && (
                    <ChangePWD />
                )}
            </div>
        </div>
    );
};

const ChangePWD: React.FC = () => {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [newPw2, setNewPw2] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!currentPw || !newPw || !newPw2) return "모든 항목을 입력하세요.";
        if (newPw !== newPw2) return "새 비밀번호가 서로 다릅니다.";
        if (newPw.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
        // todo: 추가 사항 검토
        return "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }
        setLoading(true);
        try {
            // todo: 토큰 expired 여부 체크
            // TODO: 실제 비밀번호 변경 API 호출
            // await changePasswordAPI({ currentPw, newPw });

            setSuccess("비밀번호가 성공적으로 변경되었습니다.");
            setCurrentPw("");
            setNewPw("");
            setNewPw2("");
        } catch (e: any) {
            setError("비밀번호 변경에 실패했습니다. (API 연동 필요)");
        }
        setLoading(false);
    };

    return (
        <form className="pwchange-form" onSubmit={handleSubmit} style={{ maxWidth: 340, margin: "48px auto", textAlign: "left" }}>
            <label className="pwchange-label">현재 비밀번호</label>
            <input
                type="password"
                className="pwchange-input"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
            />

            <label className="pwchange-label" style={{ marginTop: 15 }}>새 비밀번호</label>
            <input
                type="password"
                className="pwchange-input"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
            />

            <label className="pwchange-label" style={{ marginTop: 15 }}>새 비밀번호 확인</label>
            <input
                type="password"
                className="pwchange-input"
                value={newPw2}
                onChange={e => setNewPw2(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                onKeyDown={e => {
                    if (e.key === "Enter") handleSubmit(e as any);
                }}
            />

            {error && <div className="pwchange-error">{error}</div>}
            {success && <div className="pwchange-success">{success}</div>}

            <button
                className="pwchange-btn"
                type="submit"
                disabled={loading}
                style={{ width: "100%", marginTop: 24, padding: "10px 0" }}
            >
                {loading ? "변경 중..." : "비밀번호 변경하기"}
            </button>
        </form>
    );
};


export default User;
