import React, {useCallback, useEffect, useRef, useState} from "react";
import "./Note.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchNotionBlockMap } from "../../API/req";
import { NotionRenderer } from "react-notion";
import "react-notion/src/styles.css";
import "prismjs/themes/prism-tomorrow.css";

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [blockMap, setBlockMap] = useState<any | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tokenRef = useRef<string | null>(null);
    useEffect(() => { tokenRef.current = accessToken ?? null; }, [accessToken]);

    const DEFAULT_PAGE_ID = process.env.REACT_APP_DEFAULT_NOTION_PAGE_ID || "";

    const extractNotionPageId = useCallback((href: string): string | null => {
        try {
            const url = new URL(href, window.location.origin);
            const q = url.searchParams.get("pageId");
            if (q) return q.replace(/-/g, "");
        } catch {}
        const m = href.match(/[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (m && m[0]) return m[0].replace(/-/g, "");
        return null;
    }, []);

    // Notion 페이지 로드 (react-notion)
    const normalizeBlockMap = useCallback((data: any): any => {
        if (!data || typeof data !== "object") return data;
        const cloned: any = { ...data };
        for (const key of Object.keys(cloned)) {
            const block = cloned[key];
            if (!block || !block.value) continue;

            // 1) 페이지/콜아웃 아이콘이 attachment:... 형태이면 숨김 처리
            const fmt = block.value.format;
            if (fmt && typeof fmt.page_icon === "string" && /^attachment:/i.test(fmt.page_icon)) {
                cloned[key] = {
                    ...block,
                    value: {
                        ...block.value,
                        format: { ...fmt, page_icon: "" }
                    }
                };
            }

            // 2) Notion의 toggleable header를 일반 toggle로 변환 (react-notion 미지원 보완)
            const t = block.value.type;
            const isHeaderToggle = (t === "header" || t === "sub_header" || t === "sub_sub_header")
                && !!(block.value.format && block.value.format.toggleable);
            if (isHeaderToggle) {
                cloned[key] = {
                    ...block,
                    value: {
                        ...block.value,
                        type: "toggle"
                    }
                };
            }
        }
        return cloned;
    }, []);

    const loadNotionPage = useCallback(async (rawPageId: string | null, replace = false) => {
        // 로그인 필요 조건은 유지 (기존 UX 유지)
        if (!accessToken) {
            console.warn("No accessToken on loadNotionPage");
            return;
        }

        let pageId = rawPageId || "";
        pageId = pageId.replace(/^\?pageId=/, "");
        try { pageId = decodeURIComponent(pageId); } catch {}
        if (!pageId && DEFAULT_PAGE_ID) pageId = DEFAULT_PAGE_ID;
        if (!pageId) {
            console.warn("No Notion pageId provided");
            setBlockMap(null);
            return;
        }

        try {
            const data = await fetchNotionBlockMap(pageId);
            const normalized = normalizeBlockMap(data);
            setBlockMap(normalized);

            containerRef.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });

            const newUrl = `${window.location.pathname}?pageId=${encodeURIComponent(pageId)}`;
            if (replace) window.history.replaceState({ pageId }, "", newUrl);
            else window.history.pushState({ pageId }, "", newUrl);
        } catch (err) {
            console.error(err);
            alert("노션 페이지를 불러올 수 없습니다.");
        }
    }, [accessToken, DEFAULT_PAGE_ID, normalizeBlockMap]);

    // 최초 로드
    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            signOutLocal();
            navigate("/signin");
            return;
        }
        const params = new URLSearchParams(window.location.search);
        let pid = params.get("pageId");
        try { if (pid) pid = decodeURIComponent(pid); } catch {}
        loadNotionPage(pid ?? null, true);
    }, [authReady, user, accessToken, navigate, loadNotionPage, signOutLocal]);

    // 내부 링크 클릭 처리
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleClick = (e: Event) => {
            const target = e.target as Element | null;
            const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
            if (!anchor) return;

            const rawHref = anchor.getAttribute("href") || "";
            if (!rawHref || /^javascript:/i.test(rawHref)) return;

            // 외부 링크면 새탭으로 열고 종료
            if (/^https?:\/\//i.test(rawHref)) {
                e.preventDefault();
                window.open(rawHref, "_blank", "noopener,noreferrer");
                return;
            }

            // 내부 파일 네비게이션 → pageId 추출 규칙은 프로젝트 상황에 맞게 조정 필요
            e.preventDefault();
            const pid = extractNotionPageId(rawHref);
            if (pid) loadNotionPage(pid);
        };


        el.addEventListener("click", handleClick);
        return () => el.removeEventListener("click", handleClick);
    }, [blockMap, extractNotionPageId, loadNotionPage]);

    // react-notion 렌더링으로 대체되므로 Shadow DOM 주입 로직 제거

    // 뒤로가기
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const statePageId = (e.state && (e.state as any).pageId) as string | null | undefined;
            const urlPid = new URLSearchParams(window.location.search).get("pageId");
            const pid = statePageId ?? urlPid ?? null;
            loadNotionPage(pid, true);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [loadNotionPage]);

    return (
        <div className="note-wrapper" style={{ width: "100%" }}>
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button className="refresh-button" onClick={() => {
                    navigate("/note");
                    window.location.reload()
                }}>
                    새로고침
                </button>
            </div>
            <div ref={containerRef} className="note-html" style={{ width: "100%" }}>
                {blockMap && (
                    <NotionRenderer
                        blockMap={blockMap}
                        fullPage
                        hideHeader
                    />
                )}
            </div>
        </div>
    );
};

export default Note;
