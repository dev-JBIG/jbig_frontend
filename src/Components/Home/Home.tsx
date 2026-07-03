import React, {Suspense, lazy, useEffect, useRef, useState} from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./Home.css"
import "./Home-mobile.css"
import MainLayout from "../Utils/MainLayout";
import MobileNav from "../Utils/MobileNav";
import PostList from "../Posts/PostList";
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
import LoginModal from "../Utils/LoginModal";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import {useAlert} from "../Utils/AlertContext";
import JbigInfo from "./JbigInfo";
import PopupSlider from "../Utils/PopupSlider";
import PhotoAlbumSlider from "./PhotoAlbumSlider";
import $ from "jquery";

const PostDetail = lazy(() => import("../Posts/PostDetail"));
const PostWrite = lazy(() => import("../Posts/PostWrite"));
const Search = lazy(() => import("../Posts/Search"));
const Profile = lazy(() => import("../Profile/Profile"));
const routeFallback = <div style={{ minHeight: 240 }} />;

// 미디어(CDN) 베이스 URL. 운영은 REACT_APP_MEDIA_BASE_URL 로 주입(R2 + Cloudflare CDN).
// 미설정 시 CDN 커스텀 도메인으로 폴백.
const MEDIA_BASE_URL = (process.env.REACT_APP_MEDIA_BASE_URL || "https://cdn.jbig.co.kr").replace(/\/$/, "");
const BANNER_IMAGE_URL = `${MEDIA_BASE_URL}/static/banner.jpg`;

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
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
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

    // WidgetBot 채팅 위젯 제거 (모바일/PC 공통)
    useEffect(() => {
        removeWidgetBot();
        return () => {
            removeWidgetBot();
        };
    }, []);

    useEffect(() => {
        const openHandler = (e: any) => {
            const { mode, event } = e.detail || {};
            setModalMode(mode || 'create');
            setInitialEvent(event || null);
            setModalOpen(true);
        };
        window.addEventListener('OPEN_EVENT_MODAL', openHandler);
        return () => {
            window.removeEventListener('OPEN_EVENT_MODAL', openHandler);
        }
    }, []);

    useEffect(() => {
        if (isModalOpen || isLoginModalOpen) {
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
    }, [isModalOpen, isLoginModalOpen]);

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
                    // 토큰 만료 시 조용히 로그아웃 처리 (리다이렉션 없음)
                    setQuizURL("");
                    signOutLocal();
                    setUserName("");
                    setUserSemester(null);
                    setLogin(false);
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
            } catch (err) {
                console.error('[Notification] Failed to fetch unread count:', err);
            }
        };

        // 초기 로드
        loadUnreadCount();

        // 30초마다 알림 개수 갱신
        const interval = setInterval(loadUnreadCount, 30000);

        return () => clearInterval(interval);
    }, [accessToken, isLogin]);

    // 알림 드롭다운 열 때 알림 목록 조회
    const handleOpenNotifications = async () => {
        if (!accessToken) {
            showAlert({ message: "로그인이 필요합니다.", type: 'warning' });
            navigate("/signin");
            return;
        }
        
        const wasOpen = notificationOpen;
        setNotificationOpen(prev => !prev);
        
        if (!wasOpen) {
            try {
                const data = await fetchNotifications(accessToken);
                setNotifications(data);
                
                // 빈 배열이지만 unreadCount가 있다면 재조회 시도
                if (data.length === 0 && unreadCount > 0) {
                    console.warn('[Notification] Empty notifications but unreadCount > 0, rechecking...');
                    // 알림 개수 다시 확인
                    const newCount = await fetchUnreadNotificationCount(accessToken);
                    setUnreadCount(newCount);
                }
            } catch (err) {
                console.error('[Notification] Failed to fetch notifications:', err);
                // 토큰 갱신 실패로 로그아웃된 경우는 이미 interceptor에서 처리됨
                setNotificationOpen(false);
            }
        }
    };

    // 알림 클릭 시 해당 게시글로 이동
    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!accessToken) return;
        
        setNotificationOpen(false);
        
        // 게시글이나 게시판이 삭제된 경우 처리
        if (!notification.board_id || !notification.post_id) {
            showAlert({ 
                message: "삭제된 게시글입니다.", 
                type: 'warning' 
            });
            
            // 읽음 처리만 진행
            try {
                await markNotificationRead(accessToken, notification.id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
                );
            } catch (err) {
                console.error('[Notification] Failed to mark as read:', err);
            }
            return;
        }
        
        // 페이지 이동
        navigate(`/board/${notification.board_id}/${notification.post_id}`);
        
        // 읽음 처리는 백그라운드에서
        try {
            await markNotificationRead(accessToken, notification.id);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error('[Notification] Failed to mark as read:', err);
        }
    };

    // 전체 읽음 처리
    const handleMarkAllRead = async () => {
        if (!accessToken) return;
        try {
            await markNotificationRead(accessToken);
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('[Notification] Failed to mark all as read:', err);
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
                                                            {n.actor_semester > 0 ? `${n.actor_semester}기 ` : ''}{n.actor_name}
                                                        </span>
                                                        <span className="notification-text">
                                                            {n.notification_type <= 5 && '님이 '}
                                                            {n.notification_type === 1 && '회원님의 글에 댓글을 남겼습니다'}
                                                            {n.notification_type === 2 && '회원님의 댓글에 답글을 남겼습니다'}
                                                            {n.notification_type === 3 && '회원님의 글을 좋아합니다'}
                                                            {n.notification_type === 4 && '회원님의 댓글을 좋아합니다'}
                                                            {n.notification_type === 5 && '회원님의 모집에 지원했습니다'}
                                                            {n.notification_type === 6 && '모집에 합류가 확정되었습니다!'}
                                                            {n.notification_type === 7 && '모집에 선발되지 않았습니다'}
                                                            {n.notification_type === 8 && '모집이 마감되었습니다'}
                                                        </span>
                                                    </div>
                                                    <div className="notification-post-title">
                                                        {n.post_title && n.post_title.length > 25 ? n.post_title.slice(0, 25) + '...' : (n.post_title || '삭제된 게시글')}
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
                            <button className="login-button" onClick={() => setLoginModalOpen(true)}>
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
            {isProfilePage ? (
                <Suspense fallback={routeFallback}>
                    <Profile />
                </Suspense>
            ) : (
            <>
            <button type="button" className="home-banner" onClick={() => navigate('/')} aria-label="홈으로 이동">
                <img src={BANNER_IMAGE_URL} alt="banner-image" className="banner-image"/>
            </button>
            <div className="home-content">
                <Routes>
                    {/* home-content 전체 차지하는 경로 */}
                    <Route path="board/:category/write" element={
                        <Suspense fallback={routeFallback}>
                            <PostWrite boards={boards}/>
                        </Suspense>
                    }/>
                    <Route path="/board/:category/:id/modify" element={
                        <Suspense fallback={routeFallback}>
                            <PostWrite boards={boards}/>
                        </Suspense>
                    }/>
                    {/* sidebar+main-area */}
                    <Route path="/" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <JbigInfo calendarSlot={
                                <>
                                    <Calendar staffAuth={staffAuth} compact />
                                    {staffAuth && (
                                        <span className="add-event-text-home" onClick={handleAddEvent}>
                                            일정 추가
                                        </span>
                                    )}
                                </>
                            } />
                            <PostList boards={boards} isHome={true}/>
                            <PhotoAlbumSlider boards={boards} />
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <PostList boards={boards}/>
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId/:id" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <Suspense fallback={routeFallback}>
                                <PostDetail/>
                            </Suspense>
                        </MainLayout>
                    }/>
                    <Route
                        path="search/:boardId"
                        element={
                            <MainLayout sidebarProps={sidebarProps}>
                                <Suspense fallback={routeFallback}>
                                    <Search boards={boards}/>
                                </Suspense>
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

            {/* 팝업 슬라이더 */}
            <PopupSlider />
            </>
            )}
            {isLoginModalOpen && (
                <LoginModal onClose={() => setLoginModalOpen(false)} />
            )}
        </div>
    );
};

export default Home;
