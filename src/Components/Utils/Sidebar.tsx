import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../Home/Home.css"
import { SidebarProps } from "./interfaces";
import {FileText, SquareCheckBig } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons';
import {useStaffAuth} from "./StaffAuthContext";
import { getBoardIcon } from "./boardIcons";
import { fetchBoardPosts } from "../../API/req";

/**
 * 게시글이 24시간 이내에 작성되었는지 확인하는 함수
 */
const isNewPost = (dateString: string): boolean => {
    try {
        let postDate: Date;
        
        // YY/MM/DD 형식 (예: "25/12/05")
        if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('/');
            postDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // YYYY-MM-DD 형식
        else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            postDate = new Date(dateString + 'T00:00:00');
        }
        // YYYY/MM/DD 형식
        else if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('/');
            postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // 기타 형식 (ISO 등)
        else {
            postDate = new Date(dateString);
        }
        
        // 날짜가 유효한지 확인
        if (isNaN(postDate.getTime())) {
            console.warn('[Sidebar] Invalid date:', dateString);
            return false;
        }
        
        const now = new Date();
        const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
        
        console.log('[Sidebar] Post date:', dateString, '| Parsed:', postDate.toISOString(), '| Diff hours:', diffInHours.toFixed(2), '| isNew:', diffInHours >= 0 && diffInHours <= 24);
        
        return diffInHours >= 0 && diffInHours <= 24;
    } catch (error) {
        console.error('[Sidebar] Date parsing error:', error, '| dateString:', dateString);
        return false;
    }
};

// 좌측에 나오는 게시판 목록 등 관리 페이지
const Sidebar: React.FC<SidebarProps> = ({
                                             boards,
                                             isLogin,
                                             quizURL,
                                             totalCount,
                                             navigate
                                         }) => {
    const { staffAuth } = useStaffAuth();
    const location = useLocation();
    const [boardNewStatus, setBoardNewStatus] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const checkNewPosts = async () => {
            console.log('[Sidebar] Checking new posts...');
            const newStatus: Record<number, boolean> = {};
            
            for (const section of boards) {
                for (const board of section.boards) {
                    try {
                        const response = await fetchBoardPosts(
                            String(board.id),
                            1,
                            1,
                            false,
                            undefined
                        );
                        
                        if (response.posts.length > 0) {
                            const latestPost = response.posts[0];
                            const isNew = isNewPost(latestPost.date);
                            newStatus[board.id] = isNew;
                            console.log(`[Sidebar] Board "${board.name}" (ID: ${board.id}): Latest post date = ${latestPost.date}, isNew = ${isNew}`);
                        } else {
                            newStatus[board.id] = false;
                            console.log(`[Sidebar] Board "${board.name}" (ID: ${board.id}): No posts`);
                        }
                    } catch (error) {
                        newStatus[board.id] = false;
                        console.error(`[Sidebar] Error fetching posts for board "${board.name}" (ID: ${board.id}):`, error);
                    }
                }
            }
            
            console.log('[Sidebar] New status:', newStatus);
            setBoardNewStatus(newStatus);
        };

        if (boards.length > 0) {
            checkNewPosts();
        }
    }, [boards, location.pathname]); // location.pathname 추가로 페이지 이동 시마다 갱신

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
                        {section.boards.map((board) => {
                            const IconComponent = getBoardIcon(board.name);
                            const hasNewPost = boardNewStatus[board.id] || false;
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
