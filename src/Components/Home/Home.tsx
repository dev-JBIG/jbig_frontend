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
    fetchBannerImage,
    fetchQuizUrl,
    getBoards,
    signout,
    updateCalendarEvent
} from "../../API/req";
import { CircleUserRound  } from "lucide-react";
import User from "../User/User";
import {CalendarEventCreate, Section} from "../Utils/interfaces";
import { useUser } from "../Utils/UserContext";
import {AwardsSection} from "../Utils/Awards";
import {encryptUserId} from "../Utils/Encryption";
import Calendar from "../Utils/Calendar/Calendar";
import EventModal from "../Utils/Calendar/EventModal";
import VastModal from "../Utils/Vast/VastModal";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import $ from "jquery";

const Home: React.FC = () => {
    const [boards, setBoards] = useState<Section[]>([]);
    const [bannerImage, setBannerImage] = useState<string>();
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

    // 전 페이지 사용자 정보 공유
    const { user, signOutLocal, authReady, accessToken, refreshToken } = useUser();
    const { staffAuth } = useStaffAuth();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        (async () => {
            try {
                const blob = await fetchBannerImage();
                const url = URL.createObjectURL(blob);
                setBannerImage(url);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    // Minnit 채팅 - 모바일에서는 메인 페이지(/)에서만, 데스크탑에서는 모든 페이지에서 로드
    useEffect(() => {
        const isHomePage = location.pathname === '/';
        const isMobile = window.innerWidth <= 767;
        const container = document.getElementById('minnit-chat-container');

        if (!container) return;

        const shouldShowChat = isHomePage || !isMobile;

        if (shouldShowChat) {
            // 이미 로드되어 있으면 다시 로드하지 않음
            if (document.getElementById('minnit-chat-script')) return;

            // 스크립트 로드
            const script = document.createElement('script');
            script.src = 'https://minnit.chat/js/chaticon.js';
            script.defer = true;
            script.id = 'minnit-chat-script';

            // 아이콘 span 생성
            const span = document.createElement('span');
            span.setAttribute('data-icon-pixel-size', '80');
            span.setAttribute('data-chat-small-medium-or-large', 'small');
            span.setAttribute('data-circle-or-square', 'circle');
            span.setAttribute('data-left-or-right', 'right');
            span.setAttribute('data-chaturl', 'https://organizations.minnit.chat/515270226603216/c/Main');
            span.setAttribute('data-hex-color-code', '000000');
            span.setAttribute('data-icon-url', '');
            span.className = 'minnit-chat-icon-sembed';
            span.style.display = 'block';
            span.id = 'minnit-chat-icon';

            container.appendChild(script);
            container.appendChild(span);
        } else {
            // 모바일에서 메인 페이지가 아니면 제거
            container.innerHTML = '';
        }

        return () => {
            // 클린업 - 모바일에서만
            if (isMobile && container) {
                container.innerHTML = '';
            }
        };
    }, [location.pathname]);

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

    // modal 오픈 시 스크롤 차단, 우측 패딩으로 UI 변동 차단
    useEffect(() => {
        if (isModalOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            // body에 스크롤바 너비만큼 오른쪽 패딩을 추가합니다.
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
                    alert("로그인이 필요합니다.");
                    navigate("/signin");
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
    }, [authReady, user]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        navigate("/");
        if (accessToken && refreshToken) {
            await signout(accessToken, refreshToken);
        }
        signOutLocal();
        window.location.reload();
    };


    /** 이하 모달 관련 함수 */
    const handleAddEvent = () => {
        if(!authReady || !accessToken) {
            alert("로그인이 필요합니다.");
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
                alert("로그인이 필요합니다.");
                signOutLocal();
                navigate("/signin");
                return;
            }

            if (modalMode === "edit" && id) {
                // 1) 서버 반영
                const updated = await updateCalendarEvent(id, newEvent, accessToken);

                // 2) UI 반영 (기존 것 제거 후 최신으로 렌더)
                ($("#calendar") as any).fullCalendar("removeEvents", id);
                ($("#calendar") as any).fullCalendar("renderEvent", updated);
            } else {
                const created = await createCalendarEvent(newEvent, accessToken);
                ($("#calendar") as any).fullCalendar("renderEvent", created);
            }

            setModalOpen(false);
        } catch (err: any) {
            console.error("이벤트 저장 실패:", err);
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
            alert(message);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    /** 사이드 바 파라미터 */
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
                            <div className="dropdown-item" onClick={async () => {
                                if (user?.email) {
                                    const plainId = user.email.split("@")[0];
                                    const encrypted = await encryptUserId(plainId);
                                    navigate(`/user/${encrypted}`);
                                }
                                setMenuOpen(false);
                            }}>
                                내 정보
                            </div>
                            <div className="dropdown-item" onClick={handleLogout}>
                                로그아웃
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <div className="home-banner">
            <img src={bannerImage} alt="banner-image" className="banner-image"/>
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
                            <div className="main-banner">
                                <AwardsSection/>
                            </div>
                            <div className="calendar-section-wrapper">
                                <Calendar/>
                                <span className="add-event-text-home" onClick={handleAddEvent}>
                                    일정 추가
                                </span>
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
                            <PostDetail username={userName}/>
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
                    <Route path="user/:user_id" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <User />
                        </MainLayout>
                    } />
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
