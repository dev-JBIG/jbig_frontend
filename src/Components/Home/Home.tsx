import React, {useEffect, useRef, useState} from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./Home.css"
import MainLayout from "../Utils/MainLayout";
import PostList from "../Posts/PostList";
import PostDetail from "../Posts/PostDetail";
import PostWrite from "../Posts/PostWrite";
import Search from "../Posts/Search";
import { getBoards } from "../../API/req";
import { CircleUserRound  } from "lucide-react";
import User from "../User/User";
import {Section} from "../Utils/interfaces";
import {signoutFunction} from "../Utils/Functions";
import {useStaffAuth} from "../Utils/StaffAuthContext";


const Home: React.FC = () => {
    const [boards, setBoards] = useState<Section[]>([]);
    const [bannerImage, setBannerImage] = useState<string>();
    const [homeBanner, setHomeBanner] = useState<string>();
    const [totalCount, setTotalCount] = useState<number>(0);
    const [quizURL, setQuizURL] = useState<string>();
    const [userName, setUserName] = useState<string>("");
    const [userSemester, setUserSemester] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLogin, setLogin] = useState(false);

    // 전 페이지 관리자 여부 공유
    const { staffAuth, setStaffAuth } = useStaffAuth();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();


    useEffect(() => {
        // todo : 실제 파일 반영 연결 필요
        setBannerImage("https://crocuscoaching.co.uk/wp/wp-content/uploads/2013/03/maldivian_sunset-wallpaper-1000x300.jpg");
        setQuizURL("https://docs.google.com/forms/d/1ikJfMCDzAHNABX5wcRWV9Rv7jDYmmH8vYXbAsAKfOsM/viewform?edit_requested=true");

        (async () => {
            const userName = localStorage.getItem("jbig-username") || "";
            const sem = Number(localStorage.getItem("jbig-semester")) || -1;
            if (!userName || !sem) {
                setUserName("");
                setUserSemester(null);

                await signoutFunction()

            } else{
                setUserName(userName);
                setUserSemester(sem);
                setLogin(true);
            }

            try {
                const res = await getBoards();
                setBoards(Array.isArray(res?.categories) ? res.categories : []);
                setTotalCount(typeof res?.total_post_count === "number" ? res.total_post_count : 0);
            } catch (e) {
                setBoards([]);
            }
        })();
    }, []);

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
        await signoutFunction();

        navigate("/");
        window.location.reload();
    };

    const sidebarProps = { boards, isLogin, quizURL, totalCount, homeBanner, navigate };

    return (
        <div className="home-wrapper">
            <header className="home-header">
                <div className="logo" onClick={() => navigate('/')}>JBIG</div>
                <div className="user-info-wrapper" ref={dropdownRef}>
                    {userName ? (
                        <div className="user-info-clickable" onClick={() => setMenuOpen(prev => !prev)}>
                            <CircleUserRound size={18}/>
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
                                navigate("/my"); //todo : 사용자 페이지로 이동
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
                    <Route path="board/:category/write" element={<PostWrite boards={boards}/>}/>
                    {/* sidebar+main-area */}
                    <Route path="/" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <div className="main-banner">
                                {/*<img src={homeBanner} alt="home-banner" className="main-banner-image"/>*/}
                                {/* todo : 수상경력 */}
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
                        path="search"
                        element={
                            <MainLayout sidebarProps={sidebarProps}>
                                <Search />
                            </MainLayout>
                        }
                    />
                    <Route path="user/:username" element={
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
