import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { useStaffAuth } from "../Utils/StaffAuthContext";
import { useAlert } from "../Utils/AlertContext";
import { fetchSiteSettings, updateSiteSettings } from "../../API/req";
import { Menu, X } from "lucide-react";
import "./Admin.css";

function SettingsManagement({ accessToken }: { accessToken: string }) {
    const [notionPageId, setNotionPageId] = useState("");
    const [quizUrl, setQuizUrl] = useState("");
    const [jbigDescription, setJbigDescription] = useState("");
    const [jbigPresident, setJbigPresident] = useState("");
    const [jbigPresidentDept, setJbigPresidentDept] = useState("");
    const [jbigVicePresident, setJbigVicePresident] = useState("");
    const [jbigVicePresidentDept, setJbigVicePresidentDept] = useState("");
    const [jbigEmail, setJbigEmail] = useState("");
    const [jbigAdvisor, setJbigAdvisor] = useState("");
    const [jbigAdvisorDept, setJbigAdvisorDept] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const settings = await fetchSiteSettings();
                setNotionPageId(settings.notion_page_id || "");
                setQuizUrl(settings.quiz_url || "");
                setJbigDescription(settings.jbig_description || "");
                setJbigPresident(settings.jbig_president || "");
                setJbigPresidentDept(settings.jbig_president_dept || "");
                setJbigVicePresident(settings.jbig_vice_president || "");
                setJbigVicePresidentDept(settings.jbig_vice_president_dept || "");
                setJbigEmail(settings.jbig_email || "");
                setJbigAdvisor(settings.jbig_advisor || "");
                setJbigAdvisorDept(settings.jbig_advisor_dept || "");
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
            await updateSiteSettings(accessToken, {
                notion_page_id: notionPageId,
                quiz_url: quizUrl,
                jbig_description: jbigDescription,
                jbig_president: jbigPresident,
                jbig_president_dept: jbigPresidentDept,
                jbig_vice_president: jbigVicePresident,
                jbig_vice_president_dept: jbigVicePresidentDept,
                jbig_email: jbigEmail,
                jbig_advisor: jbigAdvisor,
                jbig_advisor_dept: jbigAdvisorDept
            });
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
                    
                    <h3 className="card-title" style={{ marginTop: '2rem' }}>JBIG 정보</h3>
                    
                    <div className="form-group">
                        <label className="form-label">JBIG 소개</label>
                        <textarea
                            className="admin-input"
                            value={jbigDescription}
                            onChange={(e) => setJbigDescription(e.target.value)}
                            placeholder="예: 'JBIG'(JBNU Big Data & AI Group)은..."
                            rows={3}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <p className="form-hint">홈페이지 상단에 표시되는 JBIG 학회 소개 문구입니다.</p>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">회장 이름</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigPresident}
                            onChange={(e) => setJbigPresident(e.target.value)}
                            placeholder="예: 박성현"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">회장 소속</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigPresidentDept}
                            onChange={(e) => setJbigPresidentDept(e.target.value)}
                            placeholder="예: 전자공학부"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">부회장 이름</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigVicePresident}
                            onChange={(e) => setJbigVicePresident(e.target.value)}
                            placeholder="예: 국환"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">부회장 소속</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigVicePresidentDept}
                            onChange={(e) => setJbigVicePresidentDept(e.target.value)}
                            placeholder="예: 사회학과"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">이메일</label>
                        <input
                            className="admin-input"
                            type="email"
                            value={jbigEmail}
                            onChange={(e) => setJbigEmail(e.target.value)}
                            placeholder="예: green031234@naver.com"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">지도 교수</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigAdvisor}
                            onChange={(e) => setJbigAdvisor(e.target.value)}
                            placeholder="예: 최규빈 교수님"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">지도 교수 소속</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={jbigAdvisorDept}
                            onChange={(e) => setJbigAdvisorDept(e.target.value)}
                            placeholder="예: 통계학과"
                        />
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
    const { staffAuth } = useStaffAuth();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState("dashboard");
    const [authorized, setAuthorized] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            showAlert({ message: "로그인이 필요합니다.", type: 'warning' });
            signOutLocal();
            navigate("/signin");
            return;
        }
        if (!staffAuth && !user.is_staff) {
            showAlert({
                message: "관리자 권한이 필요합니다.",
                type: 'warning',
                onClose: () => navigate("/")
            });
            return;
        }
        setAuthorized(true);
    }, [authReady, user, accessToken, navigate, signOutLocal, staffAuth]);

    const adminMenus = [
        { id: "dashboard", name: "대시보드" },
        { id: "settings", name: "사이트 설정" },
    ];

    const handleGoHome = () => {
        navigate("/");
    };

    const handleMenuSelect = (menuId: string) => {
        setCurrentPage(menuId);
        setMobileMenuOpen(false);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className="admin-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="메뉴 토글"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <div className="admin-logo" onClick={handleGoHome}>
                        JBIG Admin
                    </div>
                </div>
                <div className="admin-user-info">
                    <span>{user?.username || "관리자"}님</span>
                    <button className="admin-button button-secondary" onClick={handleGoHome}>
                        사이트 홈
                    </button>
                </div>
            </header>

            <div className="admin-content">
                {/* 모바일 오버레이 */}
                <div
                    className={`admin-sidebar-overlay ${mobileMenuOpen ? 'show' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                />

                <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    <nav className="admin-menu">
                        <ul>
                            {adminMenus.map((menu) => (
                                <li
                                    key={menu.id}
                                    className={currentPage === menu.id ? "active" : ""}
                                    onClick={() => handleMenuSelect(menu.id)}
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
