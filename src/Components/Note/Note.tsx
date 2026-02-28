import React, { useEffect, useState, useCallback, useRef } from "react";
import { NotionRenderer } from "react-notion-x";
import { ExtendedRecordMap } from "notion-types";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { useAlert } from "../Utils/AlertContext";
import { fetchSiteSettings } from "../../API/req";
import { Code } from 'react-notion-x/build/third-party/code'
import { Collection } from 'react-notion-x/build/third-party/collection'
import { Equation } from 'react-notion-x/build/third-party/equation'

import "react-notion-x/src/styles.css";
import "prismjs/themes/prism.css";

import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";

import "./Note.css";

async function fetchNotionPage(pageId: string): Promise<ExtendedRecordMap> {
    // [수정] URL 끝에 현재 시간(timestamp)을 붙여서 매번 새로운 요청인 것처럼 서버를 속입니다.
    // 추가로 fetch 옵션에 'no-store'를 주어 캐시를 아예 사용하지 않도록 강제합니다.
    const timestamp = new Date().getTime();
    const res = await fetch(`https://notion-api.splitbee.io/v1/page/${pageId}?t=${timestamp}`, {
        cache: 'no-store', // 브라우저 및 중간 프록시 캐시 방지
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch page: ${res.status}`);
    }
    const data = await res.json();

    if (data && !data.block) {
        return {
            block: data,
            collection: {},
            collection_view: {},
            notion_user: {},
            collection_query: {},
            signed_urls: {},
        } as ExtendedRecordMap;
    }

    return data;
}

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setCurrentPageId] = useState<string>("");
    const defaultPageIdRef = useRef<string>("");

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
            const defaultId = defaultPageIdRef.current;
            const newUrl = pageId === defaultId ? window.location.pathname : `${window.location.pathname}?page=${pageId}`;
            if (replace) {
                window.history.replaceState({ page: pageId }, "", newUrl);
            } else {
                window.history.pushState({ page: pageId }, "", newUrl);
            }
        } catch {
            setError("페이지를 불러올 수 없습니다. Notion 페이지가 공개 상태인지 확인하세요.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            showAlert({
                message: "로그인이 필요합니다.",
                type: 'warning',
                onClose: () => {
                    signOutLocal();
                    navigate("/signin");
                }
            });
            return;
        }

        const init = async () => {
            try {
                const settings = await fetchSiteSettings();
                const defaultPageId = settings.notion_page_id || "";
                defaultPageIdRef.current = defaultPageId;
                const params = new URLSearchParams(window.location.search);
                const pageId = params.get("page") || defaultPageId;
                loadPage(pageId, true);
            } catch {
                setError("설정을 불러올 수 없습니다.");
                setLoading(false);
            }
        };
        init();
    }, [authReady, user, accessToken, navigate, signOutLocal, loadPage]);

    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const pageId = e.state?.page || defaultPageIdRef.current;
            loadPage(pageId, true);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [loadPage]);

    const mapPageUrl = useCallback((pageId: string) => {
        const cleanId = pageId.replace(/-/g, "");
        return `${window.location.pathname}?page=${cleanId}`;
    }, []);

    const handleContentClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");
        if (!anchor) return;

        const href = anchor.getAttribute("href") || "";
        const pageMatch = href.match(/[?&]page=([a-f0-9]+)/i);
        if (pageMatch) {
            e.preventDefault();
            loadPage(pageMatch[1]);
            return;
        }

        const notionIdMatch = href.match(/\/([a-f0-9]{32})(?:\?|$)/i);
        if (notionIdMatch) {
            e.preventDefault();
            loadPage(notionIdMatch[1]);
            return;
        }

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
                    <button className="refresh-button" onClick={() => window.location.reload()}>
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
                    onClick={() => loadPage(defaultPageIdRef.current, true)}
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
                        components={{
                            Code,
                            Collection,
                            Equation
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Note;
