import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useUser } from "../Utils/UserContext";
import { fetchPublicProfile, updateResume, PublicProfile } from "../../API/req";
import { useAlert } from "../Utils/AlertContext";
import "./Profile.css";

const formatLastLogin = (isoString: string | null): string => {
    if (!isoString) return "";
    const lastLogin = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "방금 전 접속";
    if (diffMinutes < 60) return `${diffMinutes}분 전 접속`;
    if (diffHours < 24) return `${diffHours}시간 전 접속`;
    if (diffDays < 30) return `${diffDays}일 전 접속`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전 접속`;
    return `${Math.floor(diffDays / 365)}년 전 접속`;
};

const Profile: React.FC = () => {
    const { username: paramUsername } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { accessToken } = useUser();
    const { showAlert } = useAlert();

    const username = paramUsername || decodeURIComponent(location.pathname).match(/^\/@(.+)$/)?.[1];

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editMode, setEditMode] = useState(false);
    const [resumeText, setResumeText] = useState("");
    const [saving, setSaving] = useState(false);

    const loadProfile = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPublicProfile(username, accessToken || undefined);
            setProfile(data);
            setResumeText(data.resume || "");
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number } };
            if (axiosErr.response?.status === 404) {
                setError("사용자를 찾을 수 없습니다.");
            } else {
                setError("프로필을 불러오는데 실패했습니다.");
            }
        } finally {
            setLoading(false);
        }
    }, [username, accessToken]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleSaveResume = async () => {
        if (!accessToken) return;
        setSaving(true);
        try {
            await updateResume(resumeText, accessToken);
            setProfile(prev => prev ? { ...prev, resume: resumeText } : null);
            setEditMode(false);
        } catch {
            showAlert({ message: "저장에 실패했습니다.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setResumeText(profile?.resume || "");
        setEditMode(false);
    };

    if (loading) {
        return (
            <div className="profile-container">
                <div className="profile-loading">
                    <div className="loading-spinner" />
                    <p>로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="profile-container">
                <div className="profile-error">
                    <h2>😢</h2>
                    <p>{error || "프로필을 찾을 수 없습니다."}</p>
                    <button onClick={() => navigate("/")}>홈으로</button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-avatar">
                    {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                    <h1 className="profile-name">{profile.username}</h1>
                    <p className="profile-meta">
                        <span className="profile-semester">{profile.semester}기</span>
                        <span className="profile-id">@{profile.email_id}</span>
                    </p>
                    <p className="profile-joined">
                        가입일: {profile.date_joined}
                        {profile.last_login && (
                            <span className="profile-last-login"> · {formatLastLogin(profile.last_login)}</span>
                        )}
                    </p>
                </div>
                {profile.is_self && (
                    <div className="profile-actions">
                        {!editMode ? (
                            <button className="btn-edit" onClick={() => setEditMode(true)}>
                                프로필 편집
                            </button>
                        ) : (
                            <>
                                <button className="btn-save" onClick={handleSaveResume} disabled={saving}>
                                    {saving ? "저장 중..." : "저장"}
                                </button>
                                <button className="btn-cancel" onClick={handleCancelEdit}>
                                    취소
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="profile-content">
                <section className="profile-section">
                    <h2 className="section-title">소개</h2>
                    {editMode ? (
                        <div className="resume-editor">
                            <textarea
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                placeholder="자기소개를 작성해보세요. Markdown을 지원합니다."
                                rows={10}
                            />
                            <p className="editor-hint">Markdown 문법을 지원합니다.</p>
                        </div>
                    ) : (
                        <div className="resume-content">
                            {profile.resume ? (
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {profile.resume}
                                </ReactMarkdown>
                            ) : (
                                <p className="empty-text">
                                    {profile.is_self ? "프로필 편집을 눌러 자기소개를 작성해보세요." : "아직 작성된 소개가 없습니다."}
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section className="profile-section">
                    <h2 className="section-title">작성한 게시글</h2>
                    {profile.posts.length > 0 ? (
                        <ul className="profile-list">
                            {profile.posts.map((post) => (
                                <li key={post.id} className="profile-list-item" onClick={() => navigate(`/board/${post.board_id}/${post.id}`)}>
                                    <span className="item-title">{post.title}</span>
                                    <span className="item-meta">
                                        {post.created_at} · 조회 {post.views}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-text">작성한 게시글이 없습니다.</p>
                    )}
                </section>

                <section className="profile-section">
                    <h2 className="section-title">작성한 댓글</h2>
                    {profile.comments.length > 0 ? (
                        <ul className="profile-list">
                            {profile.comments.map((comment) => (
                                <li key={comment.id} className="profile-list-item profile-comment-item" onClick={() => {
                                    if (comment.board_id != null && comment.post_id != null) {
                                        navigate(`/board/${comment.board_id}/${comment.post_id}`);
                                    }
                                }}>
                                    <div className="comment-post-title">{comment.post_title}</div>
                                    <div className="comment-detail">
                                        <span className="comment-content">{comment.content}</span>
                                        <span className="comment-date">· {comment.created_at}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-text">작성한 댓글이 없습니다.</p>
                    )}
                </section>

                {profile.is_self && (
                    <section className="profile-section profile-settings">
                        <h2 className="section-title">계정 설정</h2>
                        <button className="btn-password" onClick={() => navigate("/changepwd")}>
                            비밀번호 변경
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
};

export default Profile;
