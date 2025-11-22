import React, {useEffect, useRef, useState} from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
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

const BANNER_IMAGE_URL = "https://kr.object.ncloudstorage.com/jbig/static/banner.jpg";

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
    const { user, signOutLocal, authReady, accessToken, refreshToken } = useUser();
    const { staffAuth } = useStaffAuth();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();


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
    }, [authReady, user, accessToken, navigate, signOutLocal]);

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
                            <div className="main-banner">
                                <AwardsSection/>
                            </div>
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
