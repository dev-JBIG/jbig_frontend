import React, {useEffect, useRef, useState} from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./Home.css"
import MainLayout from "../Utils/MainLayout";
import PostList from "../Posts/PostList";
import PostDetail from "../Posts/PostDetail";
import PostWrite from "../Posts/PostWrite";
import Search from "../Posts/Search";
import {fetchBannerImage, fetchQuizUrl, getBoards, signout} from "../../API/req";
import { CircleUserRound  } from "lucide-react";
import User from "../User/User";
import {Section} from "../Utils/interfaces";
import { useUser } from "../Utils/UserContext";
import {AwardsSection} from "../Utils/Awards";
import {encryptUserId} from "../Utils/Encryption";

const Home: React.FC = () => {
    const [boards, setBoards] = useState<Section[]>([]);
    const [bannerImage, setBannerImage] = useState<string>();
    const [totalCount, setTotalCount] = useState<number>(0);
    const [quizURL, setQuizURL] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [userSemester, setUserSemester] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLogin, setLogin] = useState(false);

    // 전 페이지 사용자 정보 공유
    const { user, signOutLocal, authReady, accessToken, refreshToken } = useUser();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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
        if (accessToken && refreshToken) {
            await signout(accessToken, refreshToken);
        }
        signOutLocal();
        navigate("/");
        window.location.reload();
    };

    const sidebarProps = { boards, isLogin, quizURL, totalCount, navigate };

    return (
        <div className="home-wrapper">
            <header className="home-header">
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
                    <Route path="/board/:category/:id/modify" element={<
                        PostWrite boards={boards}/>
                    }/>
                    {/* sidebar+main-area */}
                    <Route path="/" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <div className="main-banner">
                                <AwardsSection />
                            </div>
                            <PostList boards={boards} isHome={true} />
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
        </div>
    );
};

export default Home;
