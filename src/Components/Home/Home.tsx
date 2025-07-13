import React, {useEffect, useState} from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import PostList from "../Pages/PostList";
import PostDetail from "../Pages/PostDetail";
import "./Home.css";

import ReactMarkdown from "react-markdown";

function Home() {
    const [bannerImage, setBannerImage] = useState<string>(); // todo: DB 에서 URL 가져와야함
    const [homeBanner, setHomeBanner] = useState<string>();
    const navigate = useNavigate();

    const [md, setMd] = useState<string>("");
    useEffect(() => {
        fetch("/test_notion.md")
            .then((res) => res.text())
            .then((text) => setMd(text));
    }, []);

    const location = useLocation();

    const isLoggedIn = false; // todo: 실제 로그인 여부 판단 필요
    const totalCount = 1234567; // todo: 전체 게시글 수 반영 필요

    const isAdmin = localStorage.getItem("jbig-admin-token") === "true";

    const boardData = [
        {
            category: "공지",
            boards: ["공지사항", "이벤트 안내"]
        },
        {
            category: "커뮤니티",
            boards: ["자유게시판", "질문게시판", "정보공유", "유머게시판"]
        },
        {
            category: "자료실",
            boards: ["이미지 자료", "문서 자료", "코드 스니펫"]
        },
        {
            category: "관리자 전용",
            boards: ["신고 처리", "회원 관리", "운영 로그"]
        }
    ]; // todo: 게시판 정보 삽입해줘야함
    
    //todo: 임시 이미지 
    useEffect(() => {
        setBannerImage('https://crocuscoaching.co.uk/wp/wp-content/uploads/2013/03/maldivian_sunset-wallpaper-1000x300.jpg');
        setHomeBanner('https://i.namu.wiki/i/FfnnQlT1gUvgYKxm4QB7-elsT3oWpxfFoNSYayFJJWTglCpXg76PMWAUutXA0j-BFBnUli4HccRpp-a6D6DXM4lw1iI4_vcqP9EXDCzzPV1wh6zHbFphwHuyrqK_E44sbYJSQyHJPR0d01s_jnsLzA.svg');
    }, [])


    return (
        <div className="home-wrapper">
            <header className="home-header">
                <div className="logo" onClick={() => navigate('/')}>JBIG</div>
                <div className="user-info">
                // todo: 로그인 여부에 따라 아이디 or 로그인 show
                    <button className="login-button" onClick={() => navigate('/signin')}>로그인</button>
                </div>
            </header>

            <div className="home-banner">
                <img
                    src={bannerImage}
                    alt="banner-image"
                    className="banner-image"
                />
            </div>


            <div className="home-content">
                <aside className="sidebar">
                    <div className="sidebar-top-divider"/>


                    {/*// TODO: 어드민 토큰(jbig-admin-token)이 true일 때만 보여주기*/}
                    {isAdmin && (
                        <button className="sidebar-button" onClick={() => window.open("/admin", "_blank")}>관리자 페이지</button>
                    )}

                    {/* todo: 임시용, 토큰 구현 후 삭제 해야함 */}
                    <button className="sidebar-button" onClick={() => window.open("/admin", "_blank")}>
                        관리자 페이지 열기
                    </button>

                    {!isLoggedIn && <button className="sidebar-button" onClick={() => {
                        navigate("/signup")
                    }}>회원가입</button>}

                    <button
                        className="sidebar-button"
                        onClick={() => window.open("/note", "_blank")}
                    >
                        교안 탭 열기
                    </button>

                    <div className="sidebar-search-group">
                        <input
                            type="text"
                            className="sidebar-search"
                            placeholder="게시글 검색"
                        />
                        <button className="search-button">검색</button>
                    </div>

                    <ul className="menu">
                        <li className="menu-item-viewall" onClick={() => navigate("/board/전체글보기")}>
                            전체글보기
                            <span className="viewall-count">{totalCount.toLocaleString()}</span>
                        </li>
                    </ul>

                    {boardData.map((section) => (
                        <div key={section.category}>
                            <div className="sidebar-top-divider"/>
                            <div className="sidebar-category">{section.category}</div>
                            <div className="sidebar-middle-divider"/>
                            <ul className="menu">
                                {section.boards.map((boardName) => (
                                    <li key={boardName} onClick={() => navigate(`/board/${boardName}`)}>
                                        {boardName}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <div className="sidebar-top-divider"/>
                </aside>
                <main className="main-area">
                    {location.pathname === '/' ? (

                        <>
                        <iframe
                                src='https://docs.google.com/forms/d/1ikJfMCDzAHNABX5wcRWV9Rv7jDYmmH8vYXbAsAKfOsM/viewform?edit_requested=true'
                                title="Notion Test"
                                style={{
                                    width: "100%",
                                    height: "1000px",
                                    border: "none",
                                    background: "white"
                                }}
                            />

                            {/*<iframe src="https://www.notion.so/JBIG-New-1ad4d7781cdc803a9a5ef553af7782fe?pvs=4"*/}
                            {/*        title="Notion Test"*/}
                            {/*        style={{*/}
                            {/*            width: "100%",*/}
                            {/*            height: "1000px",*/}
                            {/*            border: "none",*/}
                            {/*            background: "white"*/}
                            {/*        }}/>*/}
                            {/*<div style={{width: "100%", background: "white", padding: 24}}>*/}
                            {/*    <ReactMarkdown>{md}</ReactMarkdown>*/}
                            {/*</div>*/}
                            {/*<div className="main-banner">*/}
                            {/*    <img*/}
                            {/*        src={homeBanner}*/}
                            {/*        alt="home-banner"*/}
                            {/*        className="main-banner-image"*/}
                            {/*    />*/}
                            {/*</div>*/}

                            {/*<PostList/>*/}
                        </>
                    ) : (
                        <Routes>
                            <Route path="/board/:category" element={<PostList/>}/>
                            <Route path="/board/:category/:id" element={<PostDetail/>}/>
                        </Routes>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Home;
