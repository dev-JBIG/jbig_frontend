import React from "react";
import "../Home/Home.css"
import { SidebarProps } from "./interfaces";
import {FileText, SquareCheckBig } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons';
import { getBoardIcon } from "./boardIcons";

/**
 * 게시글이 24시간 이내에 작성되었는지 확인하는 함수
 */
const isNewPost = (dateString?: string | null): boolean => {
    if (!dateString) return false;

    const postDate = new Date(dateString);
    if (isNaN(postDate.getTime())) return false;

    const now = new Date();
    const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    return diffInHours >= 0 && diffInHours <= 24;
};

// 좌측에 나오는 게시판 목록 등 관리 페이지
const Sidebar: React.FC<SidebarProps> = ({
                                             boards,
                                             isLogin,
                                             quizURL,
                                             totalCount,
                                             navigate
                                         }) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-top-divider" />
            <div className="sidebar-scrollable">
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
                    <div className="board-item-content">
                        <FileText size={18} className="board-icon"/>
                        전체 글 보기
                    </div>
                    <span className="viewall-count">{totalCount.toLocaleString()}</span>
                </li>
                {quizURL && quizURL.trim() !== "" && (
                    <li
                        className="menu-item-viewall"
                        onClick={() => window.open(quizURL, "_blank", "noopener,noreferrer")}
                    >
                        <div className="board-item-content">
                            <SquareCheckBig size={18} className="board-icon" />
                            이번 주 퀴즈
                        </div>
                    </li>
                )}
            </ul>
            <div className="sidebar-top-divider"/>

            {boards.map((section, idx) => (
                <React.Fragment key={section.category}>
                    <ul className="menu">
                        {section.boards.map((board) => {
                            const IconComponent = getBoardIcon(board.name);
                            const hasNewPost = isNewPost(board.latest_post_created_at);
                            return (
                                <li
                                    key={board.id}
                                    onClick={() => navigate(`/board/${board.id}`)}
                                >
                                    <div className="board-item-content">
                                        <IconComponent className="board-icon" size={18} />
                                        {board.name}
                                    </div>
                                    {hasNewPost && <span className="sidebar-new-badge">N</span>}
                                </li>
                            );
                        })}
                    </ul>
                    {/* 카테고리별 구분선, 마지막엔 생략 */}
                    {idx !== boards.length - 1 && <div className="sidebar-middle-divider" />}
                </React.Fragment>
            ))}


            <div className="sidebar-top-divider"/>

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

            {/* BigTech AI News 버튼 */}
            <a
                href="https://indigo-coder-github.github.io/Big-Tech-News/"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-discord-button"
            >
                <FontAwesomeIcon icon={faGithub as IconProp} className="sidebar-discord-icon" />
                BigTech AI News
            </a>
            </div>
        </aside>
    );
};

export default Sidebar;
