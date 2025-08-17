import React, { useState } from "react";
import "../Home/Home.css"
import { SidebarProps } from "./interfaces";
import {FileText, SquareCheckBig } from "lucide-react";
import {useStaffAuth} from "./StaffAuthContext";

// 좌측에 나오는 게시판 목록 등 관리 페이지
const Sidebar: React.FC<SidebarProps> = ({
                                             boards,
                                             isLogin,
                                             quizURL,
                                             totalCount,
                                             navigate
                                         }) => {

    const [sidebarQuery, setSidebarQuery] = useState("");

    const { staffAuth } = useStaffAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-top-divider" />
            {staffAuth ?
                <button className="sidebar-button" onClick={() => window.open("/admin", "_blank")}>
                    관리자 페이지 열기
                </button> : <div/>
            }
            {!isLogin && (
                <button className="sidebar-button" onClick={() => navigate("/signup")}>회원가입</button>
            )}
            {isLogin && (
                <button className="sidebar-button" onClick={() => window.open("/note", "_blank")}>
                    교안 탭 열기
                </button>
            )}
            <div className="sidebar-search-group">
                <input
                    type="text"
                    className="sidebar-search"
                    placeholder="게시글 검색"
                    value={sidebarQuery}
                    onChange={e => setSidebarQuery(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && sidebarQuery.trim()) {
                            setSidebarQuery("");
                            navigate(`/search?q=${encodeURIComponent(sidebarQuery)}`);
                        }
                    }}
                />
                <button
                    className="side-search-button"
                    onClick={() => {
                        if (sidebarQuery.trim()) {
                            setSidebarQuery("");
                            navigate(`/search?q=${encodeURIComponent(sidebarQuery)}`);
                        }
                    }}
                >
                    검색
                </button>
            </div>
            <ul className="menu">
                <li className="menu-item-viewall" onClick={() => navigate("/board/0")}>
                    <span style={{display: "flex", alignItems: "center"}}>
                        <FileText size={18} className="board-icon"/>
                        전체글보기
                    </span>
                    <span className="viewall-count">{totalCount.toLocaleString()}</span>
                </li>
                {quizURL && quizURL.trim() !== "" && (
                    <li
                        className="menu-item-viewall"
                        onClick={() => window.open(quizURL, "_blank", "noopener,noreferrer")}
                    >
                        <span style={{ display: "flex", alignItems: "center" }}>
                            <SquareCheckBig size={18} className="board-icon" />
                            이번 주 퀴즈
                        </span>
                    </li>
                )}
            </ul>
            <div className="sidebar-top-divider"/>

            {boards.map((section, idx) => (
                <React.Fragment key={section.category}>
                    <ul className="menu">
                        {section.boards.map((board) => (
                            <li
                                key={board.id}
                                onClick={() => navigate(`/board/${board.id}`)}
                            >
                                <FileText className="board-icon" size={18} />
                                {board.name}
                            </li>
                        ))}
                    </ul>
                    {/* 카테고리별 구분선, 마지막엔 생략 */}
                    {idx !== boards.length - 1 && <div className="sidebar-middle-divider" />}
                </React.Fragment>
            ))}


            <div className="sidebar-top-divider"/>
        </aside>
    );
};

export default Sidebar;
