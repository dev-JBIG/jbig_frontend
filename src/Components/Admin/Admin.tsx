import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { useStaffAuth } from "../Utils/StaffAuthContext";
import { useAlert } from "../Utils/AlertContext";
import { 
    fetchSiteSettings, 
    updateSiteSettings,
    fetchAllPopups,
    createPopup,
    updatePopup,
    deletePopup,
    PopupItem,
    PopupCreate
} from "../../API/req";
import { Menu, X, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
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

function PopupManagement({ accessToken }: { accessToken: string }) {
    const [popups, setPopups] = useState<PopupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPopup, setEditingPopup] = useState<PopupItem | null>(null);
    const { showAlert, showConfirm } = useAlert();

    // 폼 상태
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [order, setOrder] = useState(0);

    useEffect(() => {
        loadPopups();
    }, [accessToken]);

    const loadPopups = async () => {
        setLoading(true);
        try {
            const data = await fetchAllPopups(accessToken);
            setPopups(data);
        } catch (err) {
            console.error('[Popup] Failed to fetch popups:', err);
            showAlert({ message: "팝업 목록을 불러오는데 실패했습니다.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setStartDate("");
        setEndDate("");
        setIsActive(true);
        setOrder(0);
        setEditingPopup(null);
        setShowForm(false);
    };

    const handleEdit = (popup: PopupItem) => {
        setEditingPopup(popup);
        setTitle(popup.title);
        setContent(popup.content);
        setStartDate(popup.start_date.slice(0, 16));
        setEndDate(popup.end_date.slice(0, 16));
        setIsActive(popup.is_active);
        setOrder(popup.order);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim() || !startDate || !endDate) {
            showAlert({ message: "모든 필드를 입력해주세요.", type: 'warning' });
            return;
        }

        const data: PopupCreate = {
            title: title.trim(),
            content: content.trim(),
            start_date: startDate,
            end_date: endDate,
            is_active: isActive,
            order
        };

        try {
            if (editingPopup) {
                await updatePopup(editingPopup.id, data, accessToken);
                showAlert({ message: "팝업이 수정되었습니다.", type: 'success' });
            } else {
                await createPopup(data, accessToken);
                showAlert({ message: "팝업이 생성되었습니다.", type: 'success' });
            }
            resetForm();
            loadPopups();
        } catch (err) {
            console.error('[Popup] Failed to save popup:', err);
            showAlert({ 
                message: editingPopup ? "팝업 수정에 실패했습니다." : "팝업 생성에 실패했습니다.", 
                type: 'error' 
            });
        }
    };

    const handleDelete = async (id: number) => {
        showConfirm({
            message: "정말 이 팝업을 삭제하시겠습니까?",
            onConfirm: async () => {
                try {
                    await deletePopup(id, accessToken);
                    showAlert({ message: "팝업이 삭제되었습니다.", type: 'success' });
                    loadPopups();
                } catch (err) {
                    console.error('[Popup] Failed to delete popup:', err);
                    showAlert({ message: "팝업 삭제에 실패했습니다.", type: 'error' });
                }
            }
        });
    };

    const toggleActive = async (popup: PopupItem) => {
        try {
            await updatePopup(popup.id, { is_active: !popup.is_active }, accessToken);
            showAlert({ 
                message: `팝업이 ${!popup.is_active ? '활성화' : '비활성화'}되었습니다.`, 
                type: 'success' 
            });
            loadPopups();
        } catch (err) {
            console.error('[Popup] Failed to toggle popup:', err);
            showAlert({ message: "팝업 상태 변경에 실패했습니다.", type: 'error' });
        }
    };

    if (loading) {
        return (
            <>
                <h2 className="admin-content-header">팝업 관리</h2>
                <div className="admin-card">
                    <p>로딩 중...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <h2 className="admin-content-header">팝업 관리</h2>
            
            {/* 팝업 생성/수정 폼 */}
            {showForm && (
                <div className="admin-card" style={{ marginBottom: 24 }}>
                    <h3 className="card-title">
                        {editingPopup ? '팝업 수정' : '새 팝업 생성'}
                    </h3>
                    <form className="admin-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">제목 *</label>
                            <input
                                className="admin-input"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="팝업 제목"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">내용 *</label>
                            <textarea
                                className="admin-input"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="팝업 내용"
                                rows={6}
                                required
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">시작 일시 *</label>
                                <input
                                    className="admin-input"
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">종료 일시 *</label>
                                <input
                                    className="admin-input"
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">표시 순서</label>
                                <input
                                    className="admin-input"
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(Number(e.target.value))}
                                    placeholder="0"
                                />
                                <small style={{ color: '#666', marginTop: 4, display: 'block' }}>
                                    작은 숫자가 먼저 표시됩니다
                                </small>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: 8 }}>활성 여부</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                    />
                                    <span>활성화</span>
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button className="admin-button button-primary" type="submit">
                                {editingPopup ? '수정' : '생성'}
                            </button>
                            <button
                                className="admin-button button-secondary"
                                type="button"
                                onClick={resetForm}
                            >
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 팝업 목록 */}
            <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 className="card-title">팝업 목록 ({popups.length}개)</h3>
                    <button
                        className="admin-button button-primary"
                        onClick={() => setShowForm(!showForm)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Plus size={18} />
                        새 팝업
                    </button>
                </div>

                {popups.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
                        등록된 팝업이 없습니다.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>순서</th>
                                    <th>제목</th>
                                    <th>기간</th>
                                    <th>상태</th>
                                    <th>작성자</th>
                                    <th>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {popups.map((popup) => (
                                    <tr key={popup.id}>
                                        <td>{popup.order}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{popup.title}</div>
                                            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                                {popup.content.length > 50 
                                                    ? popup.content.slice(0, 50) + '...' 
                                                    : popup.content
                                                }
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>
                                                {new Date(popup.start_date).toLocaleString('ko-KR')}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#666' }}>
                                                ~ {new Date(popup.end_date).toLocaleString('ko-KR')}
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    backgroundColor: popup.is_active ? '#e8f5e9' : '#ffebee',
                                                    color: popup.is_active ? '#2e7d32' : '#c62828'
                                                }}
                                            >
                                                {popup.is_active ? '활성' : '비활성'}
                                            </span>
                                        </td>
                                        <td>{popup.created_by_username || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="admin-icon-button"
                                                    onClick={() => toggleActive(popup)}
                                                    title={popup.is_active ? '비활성화' : '활성화'}
                                                >
                                                    {popup.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                <button
                                                    className="admin-icon-button"
                                                    onClick={() => handleEdit(popup)}
                                                    title="수정"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="admin-icon-button"
                                                    onClick={() => handleDelete(popup.id)}
                                                    title="삭제"
                                                    style={{ color: '#dc2626' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
        { id: "popups", name: "팝업 관리" },
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
            case "popups":
                return <PopupManagement accessToken={accessToken} />;
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
