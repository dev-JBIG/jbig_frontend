import React, {useState} from "react";
import "../Home/Home.css"
import { SidebarProps } from "../../types/interfaces";

// 좌측에 나오는 게시판 목록 등 관리 페이지

const Sidebar: React.FC<SidebarProps> = ({
                                             boardData,
                                             isAdmin,
                                             isLoggedIn,
                                             quizURL,
                                             totalCount,
                                             homeBanner,
                                             navigate
                                         }) => {

    const [sidebarQuery, setSidebarQuery] = useState("");

    return (
        <aside className="sidebar">
            <div className="sidebar-top-divider"/>
            <button className="sidebar-button" onClick={() => window.open("/admin", "_blank")}>
                관리자 페이지 열기
            </button>
            {!isLoggedIn && (
                <button className="sidebar-button" onClick={() => navigate("/signup")}>회원가입</button>
            )}
            <button className="sidebar-button" onClick={() => window.open("/note", "_blank")}>
                교안 탭 열기
            </button>
            <div className="sidebar-search-group">
                <input
                    type="text"
                    className="sidebar-search"
                    placeholder="게시글 검색"
                    value={sidebarQuery}
                    onChange={e => setSidebarQuery(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && sidebarQuery.trim()) {
                            navigate(`/search?q=${encodeURIComponent(sidebarQuery)}`);
                        }
                    }}
                />
                <button
                    className="search-button"
                    onClick={() => {
                        if (sidebarQuery.trim()) {
                            navigate(`/search?q=${encodeURIComponent(sidebarQuery)}`);
                        }
                    }}
                >
                    검색
                </button>
            </div>
            <ul className="menu">
                <li className="menu-item-viewall" onClick={() => window.open(quizURL, '_blank', 'noopener,noreferrer')}>
                    이번 주 퀴즈
                </li>
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
    );
};

export default Sidebar;
