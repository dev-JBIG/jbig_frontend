import React, {useCallback, useEffect, useRef, useState} from "react";
import "./Note.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchNotionHtml } from "../../API/req";


const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const API_BASE = ((): string => {
    if (SERVER_HOST && SERVER_PORT) {
        return `http://${SERVER_HOST}:${SERVER_PORT}/api/html/notion/`;
    }
    // Same-origin fallback for production when env vars are not injected
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/api/html/notion/`;
    }
    // Node/test fallback
    return "/api/html/notion/";
})();

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [html, setHtml] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);
    const tokenRef = useRef<string | null>(null);
    useEffect(() => { tokenRef.current = accessToken ?? null; }, [accessToken]);

    // 내부 리소스 경로 보정
    const rewriteResourceUrls = (htmlString: string): string => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        // src 속성 처리 (img, iframe, embed 등)
        doc.querySelectorAll<HTMLElement>("[src]").forEach(el => {
            const raw = el.getAttribute("src");
            if (raw && !/^https?:/i.test(raw)) {
                try {
                    el.setAttribute("src", new URL(raw, API_BASE).toString());
                } catch (err) {
                    console.warn("Failed to rewrite src URL:", raw, err);
                    // 상대 경로인 경우 API_BASE와 결합
                    if (raw.startsWith("/")) {
                        const baseUrl = API_BASE.replace(/\/api\/html\/notion\/?$/, "");
                        el.setAttribute("src", baseUrl + raw);
                    } else {
                        el.setAttribute("src", API_BASE + raw);
                    }
                }
            }
        });

        // link[href] 처리
        doc.querySelectorAll<HTMLLinkElement>("link[href]").forEach(el => {
            const raw = el.getAttribute("href");
            if (raw && !/^https?:/i.test(raw)) {
                try {
                    el.setAttribute("href", new URL(raw, API_BASE).toString());
                } catch (err) {
                    console.warn("Failed to rewrite href URL:", raw, err);
                    if (raw.startsWith("/")) {
                        const baseUrl = API_BASE.replace(/\/api\/html\/notion\/?$/, "");
                        el.setAttribute("href", baseUrl + raw);
                    } else {
                        el.setAttribute("href", API_BASE + raw);
                    }
                }
            }
        });

        // 노션 임베딩 링크 처리 (a 태그의 href 중 노션 링크)
        doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(el => {
            const href = el.getAttribute("href");
            if (href && /notion\.so/i.test(href)) {
                // 노션 링크는 그대로 유지하되, target="_blank" 추가
                el.setAttribute("target", "_blank");
                el.setAttribute("rel", "noopener noreferrer");
            }
        });

        // iframe 임베딩 처리 (노션 임베딩이 iframe으로 올 수 있음)
        doc.querySelectorAll<HTMLIFrameElement>("iframe").forEach(el => {
            const src = el.getAttribute("src");
            if (src && /notion\.so/i.test(src)) {
                // 노션 iframe은 그대로 유지
                el.setAttribute("allowfullscreen", "true");
            }
        });

        return doc.documentElement.innerHTML;
    };

    // HTML 불러오기
    const loadHtml = useCallback(async (rawFileName: string | null, replace = false) => {
        if (!accessToken) {
            // authReady 직후 토큰 준비 전일 수 있으니 가드
            console.warn("No accessToken on loadHtml");
            return;
        }

        let fileName: string | null = rawFileName;
        if (fileName) {
            fileName = fileName.replace(/^\?file=/, "");
            try { fileName = decodeURIComponent(fileName); } catch {}
        }

        try {
            const token = tokenRef.current;
            if (!token) return;
            let data = await fetchNotionHtml(fileName, token);
            data = rewriteResourceUrls(data);
            setHtml(data);

            containerRef.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });

            const newUrl = fileName
                ? `${window.location.pathname}?file=${encodeURIComponent(fileName)}`
                : `${window.location.pathname}`;

            if (replace) window.history.replaceState({ file: fileName }, "", newUrl);
            else window.history.pushState({ file: fileName }, "", newUrl);
        } catch (err) {
            console.error(err);
            alert("페이지를 불러올 수 없습니다.");
        }
    }, [accessToken]);

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
        let fileParam = params.get("file");
        try { if (fileParam) fileParam = decodeURIComponent(fileParam); } catch {}
        loadHtml(fileParam ?? null, true);
    }, [authReady, user, accessToken, navigate, loadHtml]);

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

            // 이미지 파일이나 /media/로 시작하는 링크는 그대로 열기
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
            const isImage = imageExtensions.some(ext => rawHref.toLowerCase().endsWith(ext));
            if (isImage || rawHref.startsWith('/media/')) {
                // 이미지나 미디어 파일은 기본 동작 허용 (새 탭에서 열림)
                return;
            }

            // .html 파일만 노션 HTML로 로드
            if (rawHref.toLowerCase().endsWith('.html')) {
                e.preventDefault();
                const fileName = rawHref.split("/").pop() || rawHref;
                loadHtml(fileName);
                return;
            }

            // 기타 링크는 기본 동작 허용
        };


        el.addEventListener("click", handleClick);
        return () => el.removeEventListener("click", handleClick);
    }, [html]);

    useEffect(() => {
        const host = containerRef.current;
        if (!host) return;

        const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });

        shadow.innerHTML = `
        <div class="note-html-content">
            ${html}
        </div>
    `;

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

            // 이미지 파일이나 /media/로 시작하는 링크는 그대로 열기
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
            const isImage = imageExtensions.some(ext => rawHref.toLowerCase().endsWith(ext));
            if (isImage || rawHref.startsWith('/media/')) {
                // 이미지나 미디어 파일은 기본 동작 허용 (새 탭에서 열림)
                return;
            }

            // .html 파일만 노션 HTML로 로드
            if (rawHref.toLowerCase().endsWith('.html')) {
                e.preventDefault();
                const fileName = rawHref.split("/").pop() || rawHref;
                loadHtml(fileName);
                return;
            }

            // 기타 링크는 기본 동작 허용
        };


        shadow.addEventListener("click", handleClick);
        return () => shadow.removeEventListener("click", handleClick);
    }, [html]);

    // 뒤로가기
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const stateFile = (e.state && e.state.file) as string | null | undefined;
            // state가 비어있으면 URL을 파싱해 fallback
            const urlFile = new URLSearchParams(window.location.search).get("file");
            const file = stateFile ?? urlFile ?? null;
            loadHtml(file, true); // 항상 최신 loadHtml 호출
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [loadHtml]);

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
            <div
                ref={containerRef}
                className="note-html"
                style={{ width: "100%" }}
            />
        </div>
    );
};

export default Note;
