import React, { useEffect, useState } from "react";
import {useNavigate, useParams} from "react-router-dom";
import "./User.css";
import PostList from "../Posts/PostList";
import { UserProfile } from "../Utils/interfaces";
import { fetchUserInfo } from "../../API/req";
import { useUser } from "../Utils/UserContext";
import {decryptUserId} from "../Utils/Encryption";
import CommentList from "../CommentList/CommentList";
import {CircleUserRound} from "lucide-react";
import UserChangePWD from "../User-changePWD/User-changePWD";

const User: React.FC = () => {
    const { user_id: encryptedUserId } = useParams<{ user_id: string }>();

    const { accessToken } = useUser();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"posts" | "comments" | "changepw">("posts");
    const [isSelf, setIsSelf] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const run = async () => {
            if (!encryptedUserId) return;
            const decrypted = await decryptUserId(encryptedUserId);
            if (!decrypted) {
                alert("잘못된 접근입니다.");
                navigate("/");
                return;
            }
            setUserId(decrypted);
        };
        run();
    }, [encryptedUserId, navigate]);

    useEffect(() => {
        if (!userId) return;
        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }
        const run = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const data = await fetchUserInfo(userId, accessToken || "");

                setIsSelf(data.is_self);

                const profile: UserProfile = {
                    username: data.username,
                    email: data.email,
                    date_joined: data.date_joined,
                    role: data.role,
                    semester: data.semester,
                    is_self: data.is_self,
                    post_count: data.post_count,
                    comment_count: data.comment_count,
                };

                setUser(profile);
            } catch (e) {
                console.error(e);
                setUser(null);
            }
            setLoading(false);
        };
        run();
    }, [userId, accessToken]);

    // 내 계정이 아니면 비밀번호 변경 탭 숨김
    useEffect(() => {
        if (!isSelf && tab === "changepw") setTab("posts");
    }, [isSelf, tab]);

    if (loading) return <div className="user-profile-loading">Loading...</div>;
    if (!user) return <div className="user-profile-empty">일치하는 사용자 정보가 없습니다.</div>;

    return (
        <div className="user-profile-container">
            <div className="user-profile-header">
                <CircleUserRound size={80} color="#000" strokeWidth={1}/>
                <div className="user-profile-summary">
                    <div className="user-profile-username">
                        {user.semester}기 {user.username}
                    </div>
                    <div className="user-profile-role-line">
                        <span className="user-profile-role">{user.role}</span>
                        <span className="user-profile-joindate">
                        가입일: {user.date_joined ? user.date_joined.slice(0, 10) : "-"}
                    </span>
                    </div>
                    <div className="user-profile-stats">
                        작성글 <strong>{user.post_count ?? 0}</strong> · 작성댓글 <strong>{user.comment_count ?? 0}</strong>
                    </div>
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
                    작성댓글
                </button>
                {isSelf && (
                    <button
                        className={tab === "changepw" ? "active" : ""}
                        onClick={() => setTab("changepw")}
                    >
                        비밀번호 변경
                    </button>
                )}
            </div>

            <div className="user-profile-postlist">
                {tab === "posts" && userId && <PostList userId={userId} />}

                {tab === "comments" && userId && (
                    <div className="user-comment-wrapper">
                        <CommentList userId={userId} />
                    </div>
                )}

                {tab === "changepw" && isSelf && <UserChangePWD />}
            </div>
        </div>
    );
};

export default User;
