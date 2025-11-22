import React, { useEffect, useState } from "react";
import { NotionRenderer } from "react-notion-x";
import { ExtendedRecordMap } from "notion-types";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";

// react-notion-x 스타일
import "react-notion-x/src/styles.css";
import "./Note.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const DEFAULT_PAGE_ID = process.env.REACT_APP_DEFAULT_NOTION_PAGE_ID || "";

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPageId, setCurrentPageId] = useState<string>(DEFAULT_PAGE_ID);

    // URL에서 page_id 추출
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pageId = params.get("page") || DEFAULT_PAGE_ID;
        setCurrentPageId(pageId);
    }, []);

    // Notion 페이지 데이터 로드
    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            signOutLocal();
            navigate("/signin");
            return;
        }

        if (!currentPageId) {
            setError("Notion 페이지 ID가 설정되지 않았습니다.");
            setLoading(false);
            return;
        }

        const fetchNotionPage = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${BASE_URL}/api/html/notion/page/${currentPageId}/`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to load page: ${response.status}`);
                }

                const data = await response.json();
                setRecordMap(data as ExtendedRecordMap);
            } catch (err) {
                console.error("Notion page load error:", err);
                setError("페이지를 불러올 수 없습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchNotionPage();
    }, [authReady, user, accessToken, currentPageId, navigate, signOutLocal]);

    // 내부 링크 클릭 처리
    const handleLinkClick = (pageId: string) => {
        const cleanId = pageId.replace(/-/g, "");
        setCurrentPageId(cleanId);
        window.history.pushState(
            { page: cleanId },
            "",
            `${window.location.pathname}?page=${cleanId}`
        );
    };

    // 뒤로가기 처리
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const pageId = e.state?.page || DEFAULT_PAGE_ID;
            setCurrentPageId(pageId);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    if (loading) {
        return (
            <div className="note-wrapper">
                <div className="note-header">
                    <a href="/" className="note-logo">JBIG</a>
                </div>
                <div className="note-loading">로딩 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="note-wrapper">
                <div className="note-header">
                    <a href="/" className="note-logo">JBIG</a>
                </div>
                <div className="note-error">{error}</div>
            </div>
        );
    }

    return (
        <div className="note-wrapper">
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button
                    className="refresh-button"
                    onClick={() => {
                        setCurrentPageId(DEFAULT_PAGE_ID);
                        window.history.replaceState(null, "", window.location.pathname);
                    }}
                >
                    홈으로
                </button>
            </div>
            <div className="note-content">
                {recordMap && (
                    <NotionRenderer
                        recordMap={recordMap}
                        fullPage={true}
                        darkMode={false}
                        mapPageUrl={(pageId) => {
                            const cleanId = pageId.replace(/-/g, "");
                            return `${window.location.pathname}?page=${cleanId}`;
                        }}
                        components={{
                            PageLink: ({
                                href,
                                children,
                                ...props
                            }: {
                                href: string;
                                children: React.ReactNode;
                                [key: string]: unknown;
                            }) => {
                                const pageIdMatch = href.match(/page=([a-f0-9]+)/);
                                if (pageIdMatch) {
                                    return (
                                        <a
                                            {...props}
                                            href={href}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleLinkClick(pageIdMatch[1]);
                                            }}
                                        >
                                            {children}
                                        </a>
                                    );
                                }
                                return <a {...props} href={href}>{children}</a>;
                            },
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Note;
