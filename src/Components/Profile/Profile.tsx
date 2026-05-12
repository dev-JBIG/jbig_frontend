import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchPublicProfile, updateProfileBlocks, PublicProfile, deleteAccount } from "../../API/req";
import { useAlert } from "../Utils/AlertContext";
import { ProfileBlock, IdentityBlock } from "./types";
import ProfileBlockRenderer from "./ProfileBlockRenderer/ProfileBlockRenderer";
import "./Profile.css";

const ProfileBlockEditor = lazy(() => import("./ProfileBlockEditor/ProfileBlockEditor"));

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

type TabKey = 'resume' | 'activity';

const Profile: React.FC = () => {
    const { username: paramUsername } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { accessToken, signOutLocal } = useUser();
    const { showAlert } = useAlert();

    const username = paramUsername || decodeURIComponent(location.pathname).match(/^\/@(.+)$/)?.[1];

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleting, setDeleting] = useState(false);

    const tab: TabKey = searchParams.get('tab') === 'activity' ? 'activity' : 'resume';
    const setTab = (next: TabKey) => {
        const params = new URLSearchParams(searchParams);
        if (next === 'resume') params.delete('tab');
        else params.set('tab', next);
        setSearchParams(params, { replace: true });
    };

    const loadProfile = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPublicProfile(username, accessToken || undefined);
            setProfile(data);
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

    const handleSaveBlocks = async (blocks: ProfileBlock[]) => {
        if (!accessToken) return;
        setSaving(true);
        try {
            await updateProfileBlocks(blocks, accessToken);
            setProfile(prev => prev ? { ...prev, profile_blocks: blocks } : null);
            setEditMode(false);
            showAlert({ message: "프로필이 저장되었습니다.", type: 'success' });
        } catch {
            showAlert({ message: "저장에 실패했습니다.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditMode(false);
    };

    const handleDeleteAccount = async () => {
        if (!accessToken || !deletePassword) {
            showAlert({ message: "비밀번호를 입력해주세요.", type: 'error' });
            return;
        }

        if (!window.confirm("정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            return;
        }

        setDeleting(true);
        try {
            const result = await deleteAccount(deletePassword, accessToken);
            if (result.success) {
                showAlert({ message: result.message || "회원 탈퇴가 완료되었습니다.", type: 'success' });
                signOutLocal();
                navigate("/");
            } else {
                showAlert({ message: result.message || "회원 탈퇴에 실패했습니다.", type: 'error' });
            }
        } catch {
            showAlert({ message: "회원 탈퇴 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setDeletePassword("");
        }
    };

    const blocks = useMemo<ProfileBlock[]>(
        () => (profile?.profile_blocks || []) as ProfileBlock[],
        [profile]
    );

    const identity = useMemo<IdentityBlock['data'] | null>(() => {
        const found = blocks.find((b): b is IdentityBlock => b.type === 'identity');
        return found ? found.data : null;
    }, [blocks]);

    const bodyBlocks = useMemo<ProfileBlock[]>(
        () => blocks.filter(b => b.type !== 'identity'),
        [blocks]
    );

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

    const displayName = identity?.realName?.trim() || profile.username;
    const headline = identity?.headline?.trim() || "";
    const photoUrl = identity?.photoUrl?.trim() || "";
    const locationText = identity?.location?.trim() || "";

    return (
        <div className="profile-container resume-page">
            {/* 헤더 */}
            <header className="profile-header">
                <div className="profile-avatar">
                    {photoUrl ? (
                        <img src={photoUrl} alt={displayName} />
                    ) : (
                        <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div className="profile-info">
                    <h1 className="profile-name">
                        {displayName}
                        {identity?.realName && (
                            <span className="profile-username">@{profile.username}</span>
                        )}
                    </h1>
                    {headline && <p className="profile-headline">{headline}</p>}
                    <p className="profile-meta">
                        <span className="profile-semester">{profile.semester}기</span>
                        {locationText && <span className="profile-location">{locationText}</span>}
                        <span className="profile-id">@{profile.email_id}</span>
                    </p>
                    <p className="profile-joined">
                        가입일: {profile.date_joined}
                        {profile.last_login && (
                            <span className="profile-last-login"> · {formatLastLogin(profile.last_login)}</span>
                        )}
                    </p>
                </div>
                <div className="profile-actions">
                    {profile.is_self && !editMode && (
                        <button className="btn-edit" onClick={() => setEditMode(true)}>
                            프로필 편집
                        </button>
                    )}
                    {!editMode && tab === 'resume' && (
                        <button className="btn-print" onClick={() => window.print()} title="이력서 PDF로 저장">
                            PDF 저장
                        </button>
                    )}
                </div>
            </header>

            {/* 탭 */}
            {!editMode && (
                <nav className="profile-tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={tab === 'resume'}
                        className={`profile-tab ${tab === 'resume' ? 'is-active' : ''}`}
                        onClick={() => setTab('resume')}
                    >
                        이력서
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === 'activity'}
                        className={`profile-tab ${tab === 'activity' ? 'is-active' : ''}`}
                        onClick={() => setTab('activity')}
                    >
                        활동
                    </button>
                </nav>
            )}

            {/* 본문 */}
            {editMode ? (
                <div className="profile-content">
                    <Suspense fallback={<div className="profile-loading"><div className="loading-spinner" /><p>에디터 로딩 중...</p></div>}>
                        <ProfileBlockEditor
                            blocks={blocks}
                            onSave={handleSaveBlocks}
                            onCancel={handleCancelEdit}
                            saving={saving}
                        />
                    </Suspense>
                </div>
            ) : tab === 'resume' ? (
                <div className="profile-content resume-body">
                    {bodyBlocks.length > 0 ? (
                        <ProfileBlockRenderer blocks={bodyBlocks} />
                    ) : (
                        <div className="profile-empty-blocks">
                            <p>{profile.is_self ? "프로필 편집을 눌러 나만의 이력서를 작성해 보세요!" : "아직 작성된 이력서가 없습니다."}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="profile-content activity-body">
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
                            <button className="btn-delete-account" onClick={() => setShowDeleteModal(true)}>
                                회원 탈퇴
                            </button>
                        </section>
                    )}
                </div>
            )}

            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>회원 탈퇴</h3>
                        <p className="modal-warning">
                            회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                            <br />
                            계속하시려면 비밀번호를 입력해주세요.
                        </p>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="비밀번호"
                            className="modal-input"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleDeleteAccount();
                                }
                            }}
                        />
                        <div className="modal-actions">
                            <button
                                className="modal-btn modal-btn-cancel"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletePassword("");
                                }}
                                disabled={deleting}
                            >
                                취소
                            </button>
                            <button
                                className="modal-btn modal-btn-delete"
                                onClick={handleDeleteAccount}
                                disabled={deleting || !deletePassword}
                            >
                                {deleting ? "처리 중..." : "탈퇴"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
