import React, {useEffect, useRef, useState} from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./Home.css"
import "./Home-mobile.css"
import MainLayout from "../Utils/MainLayout";
import MobileNav from "../Utils/MobileNav";
import PostList from "../Posts/PostList";
import PostDetail from "../Posts/PostDetail";
import PostWrite from "../Posts/PostWrite";
import Search from "../Posts/Search";
import {
    createCalendarEvent,
    fetchQuizUrl,
    getBoards,
    signout,
    updateCalendarEvent,
    fetchNotifications,
    fetchUnreadNotificationCount,
    markNotificationRead,
    NotificationItem
} from "../../API/req";
import { CircleUserRound, Bell } from "lucide-react";
import {CalendarEventCreate, Section} from "../Utils/interfaces";
import { useUser } from "../Utils/UserContext";
import Calendar from "../Utils/Calendar/Calendar";
import EventModal from "../Utils/Calendar/EventModal";
import VastModal from "../Utils/Vast/VastModal";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import {useAlert} from "../Utils/AlertContext";
import Profile from "../Profile/Profile";
import JbigInfo from "./JbigInfo";
import $ from "jquery";

const BANNER_IMAGE_URL = "https://kr.object.ncloudstorage.com/jbig/static/banner.jpg";

// WidgetBot 로드 함수 (모바일 메인페이지에서만 사용)
const loadWidgetBot = () => {
    if ((window as any).__widgetBotLoaded) return;
    (window as any).__widgetBotLoaded = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/crate@3';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        new (window as any).Crate({
            server: '1441687190953267252',
            channel: '1441687191620419657',
        });
    };
    document.head.appendChild(script);
};

const removeWidgetBot = () => {
    const crateElement = document.querySelector('widgetbot-crate');
    if (crateElement) {
        crateElement.remove();
    }
};

const Home: React.FC = () => {
    const [boards, setBoards] = useState<Section[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [quizURL, setQuizURL] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [userSemester, setUserSemester] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLogin, setLogin] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create'|'edit'>('create');
    const [initialEvent, setInitialEvent] = useState<any>(null);
    const [isVastOpen, setVastOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, signOutLocal, authReady, accessToken, refreshToken } = useUser();
    const { staffAuth } = useStaffAuth();
    const { showAlert } = useAlert();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const isProfilePage = decodeURIComponent(location.pathname).startsWith('/@');
    const isMainPage = location.pathname === '/';

    // 모바일 메인페이지에서만 WidgetBot 표시
    useEffect(() => {
        const isMobile = window.innerWidth <= 768;

        if (isMobile && isMainPage) {
            loadWidgetBot();
        } else {
            removeWidgetBot();
        }

        return () => {
            removeWidgetBot();
        };
    }, [isMainPage]);

    useEffect(() => {
        const openHandler = (e: any) => {
            const { mode, event } = e.detail || {};
            setModalMode(mode || 'create');
            setInitialEvent(event || null);
            setModalOpen(true);
        };
        window.addEventListener('OPEN_EVENT_MODAL', openHandler);
        const openVastHandler = () => setVastOpen(true);
        window.addEventListener('OPEN_VAST_MODAL', openVastHandler);
        return () => {
            window.removeEventListener('OPEN_EVENT_MODAL', openHandler);
            window.removeEventListener('OPEN_VAST_MODAL', openVastHandler);
        }
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.paddingRight = `${scrollbarWidth}px`;
            document.body.classList.add('modal-open');
        } else {
            document.body.style.paddingRight = '';
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.style.paddingRight = '';
            document.body.classList.remove('modal-open');
        };
    }, [isModalOpen]);

    useEffect(() => {
        if (!authReady) return;

        const run = async () => {
            const userName = user?.username ?? "";
            const semRaw = user?.semester;
            const sem = semRaw !== undefined && semRaw !== null ? Number(semRaw) : NaN;

            if (!userName || !Number.isFinite(sem) || sem <= 0 || !accessToken) {
                setUserName("");
                setUserSemester(null);
                setLogin(false);
            } else {
                setUserName(userName);
                setUserSemester(sem);
                setLogin(true);
                const url = await fetchQuizUrl(accessToken);
                if (!url) {
                    setQuizURL("");
                } else if(url === "401") {
                    setQuizURL("");
                    signOutLocal();
                    showAlert({
                        message: "로그인이 필요합니다.",
                        type: 'warning',
                        onClose: () => navigate("/signin")
                    });
                } else{
                    setQuizURL(url);
                }
            }

            try {
                const res = await getBoards();
                setBoards(Array.isArray(res?.categories) ? res.categories : []);
                setTotalCount(typeof res?.total_post_count === "number" ? res.total_post_count : 0);
            } catch {
                setBoards([]);
            }
        };

        run();
    }, [authReady, user, accessToken, navigate, signOutLocal]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 알림 개수 주기적으로 조회 (30초마다)
    useEffect(() => {
        if (!accessToken || !isLogin) {
            setUnreadCount(0);
            return;
        }

        const loadUnreadCount = async () => {
            try {
                const count = await fetchUnreadNotificationCount(accessToken);
                setUnreadCount(count);
            } catch {
                // 무시
            }
        };

        loadUnreadCount();
    }, [accessToken, isLogin]);

    // 알림 드롭다운 열 때 알림 목록 조회
    const handleOpenNotifications = async () => {
        if (!accessToken) return;
        setNotificationOpen(prev => !prev);
        if (!notificationOpen) {
            try {
                const data = await fetchNotifications(accessToken);
                setNotifications(data);
            } catch {
                // 무시
            }
        }
    };

    // 알림 클릭 시 해당 게시글로 이동
    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!accessToken) return;
        try {
            await markNotificationRead(accessToken, notification.id);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
        } catch {
            // 무시
        }
        setNotificationOpen(false);
        navigate(`/board/${notification.board_id}/${notification.post_id}`);
    };

    // 전체 읽음 처리
    const handleMarkAllRead = async () => {
        if (!accessToken) return;
        try {
            await markNotificationRead(accessToken);
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {
            // 무시
        }
    };

    const handleLogout = async () => {
        navigate("/");
        if (accessToken && refreshToken) {
            await signout(accessToken, refreshToken);
        }
        signOutLocal();
        window.location.reload();
    };

    const handleAddEvent = () => {
        if(!authReady || !accessToken) {
            showAlert({ message: "로그인이 필요합니다.", type: 'warning' });
            signOutLocal();
            navigate("/signin");
            return;
        }
        setModalMode('create');
        setInitialEvent(null);
        setModalOpen(true);
    };

    const handleSaveEvent = async (newEvent: CalendarEventCreate, id?: string) => {
        try {
            if (!accessToken) {
                showAlert({ message: "로그인이 필요합니다.", type: 'warning' });
                signOutLocal();
                navigate("/signin");
                return;
            }

            const $calendar = ($("#calendar") as any);

            if (modalMode === "edit" && id) {
                const updated = await updateCalendarEvent(id, newEvent, accessToken);
                $calendar.fullCalendar("removeEvents", id);
                $calendar.fullCalendar("renderEvent", updated);
            } else {
                const created = await createCalendarEvent(newEvent, accessToken);
                $calendar.fullCalendar("renderEvent", created);
            }

            setModalOpen(false);
        } catch (err: any) {
            let message = "이벤트 저장 중 오류가 발생했습니다.";
            if (err?.response?.data) {
                const d = err.response.data;
                if (typeof d === 'string') message = d;
                else if (typeof d?.detail === 'string') message = d.detail;
                else if (typeof d?.message === 'string') message = d.message;
                else if (typeof d === 'object') {
                    const firstKey = Object.keys(d)[0];
                    const firstVal = d[firstKey];
                    if (Array.isArray(firstVal) && firstVal.length > 0) message = firstVal[0];
                }
            }
            showAlert({ message, type: 'error' });
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const sidebarProps = { boards, isLogin, quizURL, totalCount, navigate };

    if (isProfilePage) return <Profile />;

    return (
        <div className="home-wrapper">
            <header className="home-header">
                <MobileNav
                    boards={boards}
                    isLogin={isLogin}
                    quizURL={quizURL}
                    totalCount={totalCount}
                    navigate={navigate}
                    staffAuth={staffAuth}
                />
                <div className="logo" onClick={() => navigate('/')}>JBIG</div>
                <div className="header-right-section">
                    {/* 알림 아이콘 */}
                    {isLogin && (
                        <div className="notification-wrapper" ref={notificationRef}>
                            <div className="notification-icon-wrapper" onClick={handleOpenNotifications}>
                                <Bell size={20} color="#000" />
                                {unreadCount > 0 && (
                                    <span className="notification-badge">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            {notificationOpen && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <span className="notification-title">알림</span>
                                        {unreadCount > 0 && (
                                            <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                                                모두 읽음
                                            </button>
                                        )}
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <div className="notification-empty">알림이 없습니다</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                                                    onClick={() => handleNotificationClick(n)}
                                                >
                                                    <div className="notification-content">
                                                        <span className="notification-actor">
                                                            {n.actor_semester}기 {n.actor_name}
                                                        </span>
                                                        <span className="notification-text">
                                                            님이 {n.notification_type === 1 && '회원님의 글에 댓글을 남겼습니다'}
                                                            {n.notification_type === 2 && '회원님의 댓글에 답글을 남겼습니다'}
                                                            {n.notification_type === 3 && '회원님의 글을 좋아합니다'}
                                                            {n.notification_type === 4 && '회원님의 댓글을 좋아합니다'}
                                                        </span>
                                                    </div>
                                                    <div className="notification-post-title">
                                                        {n.post_title.length > 25 ? n.post_title.slice(0, 25) + '...' : n.post_title}
                                                    </div>
                                                    {n.comment_content && (
                                                        <div className="notification-comment">
                                                            "{n.comment_content}"
                                                        </div>
                                                    )}
                                                    <div className="notification-time">
                                                        {new Date(n.created_at).toLocaleDateString('ko-KR', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 유저 메뉴 */}
                    <div className="user-info-wrapper" ref={dropdownRef}>
                        {userName ? (
                            <div className="user-info-clickable" onClick={() => setMenuOpen(prev => !prev)}>
                                <CircleUserRound size={19} color="#000" />
                                <span className="user-info-name">
                                    {typeof userSemester === "number" && userSemester > 0 && (
                                        <span style={{fontSize: 13, marginRight: 2}}>{userSemester}기&nbsp;</span>
                                    )}
                                    {userName}
                                </span>
                            </div>
                        ) : (
                            <button className="login-button" onClick={() => navigate('/signin')}>
                                로그인
                            </button>
                        )}

                        {menuOpen && (
                            <div className="user-dropdown">
                                <div className="dropdown-item" onClick={() => {
                                    if (user?.email) {
                                        const username = user.email.split("@")[0];
                                        navigate(`/@${username}`);
                                    }
                                    setMenuOpen(false);
                                }}>
                                    내 정보
                                </div>
                                {(staffAuth || user?.is_staff) && (
                                    <div className="dropdown-item" onClick={() => {
                                        navigate('/admin');
                                        setMenuOpen(false);
                                    }}>
                                        관리자 페이지 열기
                                    </div>
                                )}
                                <div className="dropdown-item" onClick={handleLogout}>
                                    로그아웃
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <div className="home-banner">
            <img src={BANNER_IMAGE_URL} alt="banner-image" className="banner-image"/>
            </div>
            <div className="home-content">
                <Routes>
                    {/* home-content 전체 차지하는 경로 */}
                    <Route path="board/:category/write" element={
                        <PostWrite boards={boards}/>
                    }/>
                    <Route path="/board/:category/:id/modify" element={
                        <PostWrite boards={boards}/>
                    }/>
                    {/* sidebar+main-area */}
                    <Route path="/" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <JbigInfo />
                            <div className="calendar-section-wrapper">
                                <Calendar staffAuth={staffAuth}/>
                                {staffAuth && (
                                    <span className="add-event-text-home" onClick={handleAddEvent}>
                                        일정 추가
                                    </span>
                                )}
                            </div>
                            <PostList boards={boards} isHome={true}/>
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <PostList boards={boards}/>
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId/:id" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <PostDetail/>
                        </MainLayout>
                    }/>
                    <Route
                        path="search/:boardId"
                        element={
                            <MainLayout sidebarProps={sidebarProps}>
                                <Search boards={boards}/>
                            </MainLayout>
                        }
                    />
                </Routes>
            </div>
            {isModalOpen && (
                <EventModal
                    mode={modalMode}
                    initial={initialEvent}
                    onClose={handleCloseModal}
                    onSave={handleSaveEvent}
                />
            )}
            {isVastOpen && (
                <VastModal onClose={() => setVastOpen(false)} />
            )}
        </div>
    );
};

export default Home;
