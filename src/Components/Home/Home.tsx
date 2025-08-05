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


const Home: React.FC = () => {
    const [boards, setBoards] = useState<
        {
            category: string;
            categoryId: number;
            boards: { id: number; name: string }[];
        }[]
    >([]);
    const [bannerImage, setBannerImage] = useState<string>();
    const [homeBanner, setHomeBanner] = useState<string>();
    const [quizURL, setQuizURL] = useState<string>();
    const [userName, setUserName] = useState<string>();
    const [userSemester, setUserSemester] = useState<number>();
    const [menuOpen, setMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();


    useEffect(() => {
        // todo : 실제 파일 반영 연결 필요
        setBannerImage("https://crocuscoaching.co.uk/wp/wp-content/uploads/2013/03/maldivian_sunset-wallpaper-1000x300.jpg");
        setHomeBanner('data:image/jpeg;base64,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');
        setQuizURL("https://docs.google.com/forms/d/1ikJfMCDzAHNABX5wcRWV9Rv7jDYmmH8vYXbAsAKfOsM/viewform?edit_requested=true");

        (async () => {
            const userName = localStorage.getItem("jbig-username") || "";
            const sem = Number(localStorage.getItem("jbig-semester")) || 0;
            if (!userName || !sem) {
                localStorage.removeItem("jbig-accessToken");
                localStorage.removeItem("jbig-semester");

                setUserName("");
            } else{
                setUserName(userName);
                setUserSemester(sem || 0);
            }

            try {
                const rawData: Section[] = await getBoards();
                setBoards(rawData);
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

    const handleLogout = () => {
        localStorage.removeItem("jbig-accessToken");
        localStorage.removeItem("jbig-username");
        localStorage.removeItem("jbig-semester");
        // todo : api 연결 -> 서버측 토큰 삭제
        navigate("/");
        window.location.reload();
    };

    // todo 임시 값
    const isLoggedIn = false;
    const isAdmin = localStorage.getItem("jbig-admin-token") === "true";
    const totalCount = 1234567;

    const sidebarProps = { boards, isAdmin, isLoggedIn, quizURL, totalCount, homeBanner, navigate };

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
                                navigate("/my");
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
                    <Route path="board/:category/write" element={<PostWrite/>}/>
                    {/* sidebar+main-area */}
                    <Route path="/" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <div className="main-banner">
                                <img src={homeBanner} alt="home-banner" className="main-banner-image"/>
                            </div>
                            <PostList boards={boards}/>
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <PostList boards={boards}/>
                        </MainLayout>
                    }/>
                    <Route path="board/:boardId/:id" element={
                        <MainLayout sidebarProps={sidebarProps}>
                            <PostDetail />
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
