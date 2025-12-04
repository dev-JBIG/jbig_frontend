import React from "react";
import "../Home/Home.css"
import { SidebarProps } from "./interfaces";
import {FileText, SquareCheckBig } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import {useStaffAuth} from "./StaffAuthContext";

// 좌측에 나오는 게시판 목록 등 관리 페이지
const Sidebar: React.FC<SidebarProps> = ({
                                             boards,
                                             isLogin,
                                             quizURL,
                                             totalCount,
                                             navigate
                                         }) => {
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
                <button className="sidebar-button open-notion-btn" onClick={() => window.open("/note", "_blank")}>
                    교안 탭 열기
                </button>
            )}
            <ul className="menu">
                <li className="menu-item-viewall" onClick={() => navigate("/board/0")}>
                    <span style={{display: "flex", alignItems: "center"}}>
                        <FileText size={18} className="board-icon"/>
                        전체 글 보기
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

            {/* GPU 인스턴스 대여 버튼 */}
            <button
                type="button"
                className="sidebar-discord-button sidebar-gpu-button"
                onClick={() => {
                    window.dispatchEvent(new CustomEvent('OPEN_VAST_MODAL'));
                }}
            >
                <FontAwesomeIcon icon={faDiscord as IconProp} className="sidebar-discord-icon" style={{display:'none'}} />
                GPU 인스턴스 대여
            </button>

            {/* 좌측 하단 디스코드 소모임 버튼 */}
            <a
                href="https://discord.gg/knpBCvvfGa"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-discord-button"
            >
                <FontAwesomeIcon icon={faDiscord as IconProp} className="sidebar-discord-icon" />
                비밀 게임 소모임
            </a>
        </aside>
    );
};

export default Sidebar;
