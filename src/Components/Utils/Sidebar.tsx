import React from "react";
import "../Home/Home.css"
import { SidebarProps, Board } from "./interfaces";
import {FileText, SquareCheckBig, Lock } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons';
import { getBoardIcon } from "./boardIcons";
import { useUser } from "./UserContext";
import { useAlert } from "./AlertContext";

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
    const { accessToken, user } = useUser();
    const { showAlert } = useAlert();

    // read_permission 미지정은 'all'(전체공개)로 취급해 하위호환 유지
    // 'author'(본인+스태프) 게시판은 진입 자체는 회원 전체에게 열린다(제출·본인 글 확인용).
    const requiresLogin = (board: Board): boolean =>
        board.read_permission === 'member' || board.read_permission === 'author';

    const isBoardLocked = (board: Board): boolean =>
        (requiresLogin(board) && !accessToken) ||
        (board.read_permission === 'staff' && !(user?.is_staff));

    const handleBoardClick = (board: Board) => {
        if (requiresLogin(board) && !accessToken) {
            showAlert({ message: '회원 전용 게시판입니다. 로그인 후 이용해주세요.', type: 'warning' });
            navigate("/signin");
            return;
        }
        if (board.read_permission === 'staff' && !(user?.is_staff)) {
            showAlert({ message: '스태프 전용 게시판입니다.', type: 'warning' });
            return;
        }
        navigate(`/board/${board.id}`);
    };

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
                            const locked = isBoardLocked(board);
                            return (
                                <li
                                    key={board.id}
                                    onClick={() => handleBoardClick(board)}
                                >
                                    <div className="board-item-content">
                                        <IconComponent className="board-icon" size={18} />
                                        {board.name}
                                        {locked && (
                                            <Lock
                                                size={14}
                                                color="#999"
                                                style={{ marginLeft: 4, verticalAlign: "middle", flexShrink: 0 }}
                                            />
                                        )}
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
