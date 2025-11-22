import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchSiteSettings, updateSiteSettings } from "../../API/req";
import "./Admin.css";

function SettingsManagement({ accessToken }: { accessToken: string }) {
    const [notionPageId, setNotionPageId] = useState("");
    const [quizUrl, setQuizUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const settings = await fetchSiteSettings();
                setNotionPageId(settings.notion_page_id || "");
                setQuizUrl(settings.quiz_url || "");
            } catch {
                setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await updateSiteSettings({ notion_page_id: notionPageId, quiz_url: quizUrl }, accessToken);
            setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
        } catch {
            setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <h2 className="admin-content-header">사이트 설정</h2>
                <div className="admin-card">
                    <p>로딩 중...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <h2 className="admin-content-header">사이트 설정</h2>
            <div className="admin-card">
                <h3 className="card-title">주요 설정</h3>
                {message && (
                    <div className={`admin-message ${message.type}`}>
                        {message.text}
                    </div>
                )}
                <div className="admin-form">
                    <div className="form-group">
                        <label className="form-label">Notion 페이지 ID</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={notionPageId}
                            onChange={(e) => setNotionPageId(e.target.value)}
                            placeholder="예: 1ad4d7781cdc803a9a5ef553af7782fe"
                        />
                        <p className="form-hint">교안 페이지의 기본 Notion 페이지 ID입니다.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">퀴즈 URL</label>
                        <input
                            className="admin-input"
                            type="url"
                            value={quizUrl}
                            onChange={(e) => setQuizUrl(e.target.value)}
                            placeholder="예: https://forms.gle/..."
                        />
                        <p className="form-hint">사이드바에 표시되는 퀴즈 링크입니다.</p>
                    </div>
                    <button
                        className="admin-button button-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "저장 중..." : "설정 저장"}
                    </button>
                </div>
            </div>
        </>
    );
}

function Dashboard() {
    return (
        <>
            <h2 className="admin-content-header">대시보드</h2>
            <div className="admin-card">
                <h3 className="card-title">관리자 페이지</h3>
                <p style={{ color: '#666', marginTop: 12 }}>
                    왼쪽 메뉴에서 관리할 항목을 선택하세요.
                </p>
            </div>
        </>
    );
}

function Admin() {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState("dashboard");
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            signOutLocal();
            navigate("/signin");
            return;
        }
        if (!user.is_staff) {
            alert("관리자 권한이 필요합니다.");
            navigate("/");
            return;
        }
        setAuthorized(true);
    }, [authReady, user, accessToken, navigate, signOutLocal]);

    const adminMenus = [
        { id: "dashboard", name: "대시보드" },
        { id: "settings", name: "사이트 설정" },
    ];

    const handleGoHome = () => {
        navigate("/");
    };

    const renderContent = () => {
        if (!accessToken) return null;
        switch (currentPage) {
            case "settings":
                return <SettingsManagement accessToken={accessToken} />;
            default:
                return <Dashboard />;
        }
    };

    if (!authReady || !authorized) {
        return (
            <div className="admin-container">
                <div className="admin-loading">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <header className="admin-header-bar">
                <div className="admin-logo" onClick={handleGoHome}>
                    JBIG Admin
                </div>
                <div className="admin-user-info">
                    <span>{user?.username || "관리자"}님</span>
                    <button className="admin-button button-secondary" onClick={handleGoHome}>
                        사이트 홈
                    </button>
                </div>
            </header>

            <div className="admin-content">
                <aside className="admin-sidebar">
                    <nav className="admin-menu">
                        <ul>
                            {adminMenus.map((menu) => (
                                <li
                                    key={menu.id}
                                    className={currentPage === menu.id ? "active" : ""}
                                    onClick={() => setCurrentPage(menu.id)}
                                >
                                    {menu.name}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <main className="admin-main-area">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

export default Admin;
