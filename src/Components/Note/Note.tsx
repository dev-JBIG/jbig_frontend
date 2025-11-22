import React, { useEffect, useState, useCallback } from "react";
import { NotionRenderer } from "react-notion-x";
import { ExtendedRecordMap } from "notion-types";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";

// react-notion-x 기본 스타일
import "react-notion-x/src/styles.css";
import "./Note.css";

const DEFAULT_PAGE_ID = process.env.REACT_APP_DEFAULT_NOTION_PAGE_ID || "";

// Notion 페이지 데이터를 가져오는 함수 (splitbee 프록시 사용)
async function fetchNotionPage(pageId: string): Promise<ExtendedRecordMap> {
    const res = await fetch(`https://notion-api.splitbee.io/v1/page/${pageId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch page: ${res.status}`);
    }
    return res.json();
}

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPageId, setCurrentPageId] = useState<string>(DEFAULT_PAGE_ID);

    // 페이지 로드 함수
    const loadPage = useCallback(async (pageId: string, replace = false) => {
        if (!pageId) {
            setError("Notion 페이지 ID가 설정되지 않았습니다.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchNotionPage(pageId);
            setRecordMap(data);
            setCurrentPageId(pageId);

            // URL 업데이트
            const newUrl = pageId === DEFAULT_PAGE_ID
                ? window.location.pathname
                : `${window.location.pathname}?page=${pageId}`;

            if (replace) {
                window.history.replaceState({ page: pageId }, "", newUrl);
            } else {
                window.history.pushState({ page: pageId }, "", newUrl);
            }
        } catch (err) {
            console.error("Notion page load error:", err);
            setError("페이지를 불러올 수 없습니다. Notion 페이지가 공개 상태인지 확인하세요.");
        } finally {
            setLoading(false);
        }
    }, []);

    // URL에서 page_id 추출 및 초기 로드
    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            signOutLocal();
            navigate("/signin");
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const pageId = params.get("page") || DEFAULT_PAGE_ID;
        loadPage(pageId, true);
    }, [authReady, user, accessToken, navigate, signOutLocal, loadPage]);

    // 뒤로가기 처리
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const pageId = e.state?.page || DEFAULT_PAGE_ID;
            loadPage(pageId, true);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [loadPage]);

    // 내부 Notion 링크 URL 매핑
    const mapPageUrl = useCallback((pageId: string) => {
        const cleanId = pageId.replace(/-/g, "");
        return `${window.location.pathname}?page=${cleanId}`;
    }, []);

    // 내부 링크 클릭 처리
    const handleContentClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");
        if (!anchor) return;

        const href = anchor.getAttribute("href") || "";

        // 내부 페이지 링크인 경우 (?page=...)
        const pageMatch = href.match(/[?&]page=([a-f0-9]+)/i);
        if (pageMatch) {
            e.preventDefault();
            loadPage(pageMatch[1]);
            return;
        }

        // Notion 페이지 ID 형식의 링크 (32자 hex)
        const notionIdMatch = href.match(/\/([a-f0-9]{32})(?:\?|$)/i);
        if (notionIdMatch) {
            e.preventDefault();
            loadPage(notionIdMatch[1]);
            return;
        }

        // 외부 링크는 새 탭에서 열기
        if (href.startsWith("http") && !href.includes(window.location.host)) {
            e.preventDefault();
            window.open(href, "_blank", "noopener,noreferrer");
        }
    }, [loadPage]);

    if (loading) {
        return (
            <div className="note-wrapper">
                <div className="note-header">
                    <a href="/" className="note-logo">JBIG</a>
                </div>
                <div className="note-loading">
                    <div className="loading-spinner"></div>
                    <p>로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="note-wrapper">
                <div className="note-header">
                    <a href="/" className="note-logo">JBIG</a>
                    <button className="refresh-button" onClick={() => loadPage(DEFAULT_PAGE_ID, true)}>
                        다시 시도
                    </button>
                </div>
                <div className="note-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="note-wrapper">
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button
                    className="refresh-button"
                    onClick={() => loadPage(DEFAULT_PAGE_ID, true)}
                >
                    홈으로
                </button>
            </div>
            <div className="note-content" onClick={handleContentClick}>
                {recordMap && (
                    <NotionRenderer
                        recordMap={recordMap}
                        fullPage={true}
                        darkMode={false}
                        mapPageUrl={mapPageUrl}
                    />
                )}
            </div>
        </div>
    );
};

export default Note;
