import React, { useEffect, useRef, useState } from "react";
import "./Note.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchNoteHtml } from "../../API/req";

const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const DEFAULT_FILE = "JBIG 교안 (New) 1ad4d7781cdc803a9a5ef553af7782fe.html";
const API_BASE = `http://${SERVER_HOST}:${SERVER_PORT}/api/html/notion/`

const Note: React.FC = () => {
    const { user, authReady, accessToken, signOutLocal } = useUser();
    const navigate = useNavigate();
    const [html, setHtml] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    // 내부 리소스 경로 보정
    const rewriteResourceUrls = (htmlString: string): string => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        doc.querySelectorAll<HTMLElement>("[src]").forEach(el => {
            const raw = el.getAttribute("src");
            if (raw && !/^https?:/i.test(raw)) {
                el.setAttribute("src", new URL(raw, API_BASE).toString());
            }
        });

        doc.querySelectorAll<HTMLLinkElement>("link[href]").forEach(el => {
            const raw = el.getAttribute("href");
            if (raw && !/^https?:/i.test(raw)) {
                el.setAttribute("href", new URL(raw, API_BASE).toString());
            }
        });

        return doc.documentElement.innerHTML;
    };

    // HTML 불러오기
    const loadHtml = async (rawFileName: string, replace = false) => {
        // 방어: 혹시 "?file=" prefix가 들어오면 제거
        let fileName = rawFileName.replace(/^\?file=/, "");

        // 한번 디코딩해서 원본 파일명 확보
        try {
            fileName = decodeURIComponent(fileName);
        } catch {
            // 디코딩 실패하면 원본 그대로 둠
        }

        try {
            let data = await fetchNoteHtml(fileName, accessToken!);
            data = rewriteResourceUrls(data);
            setHtml(data);

            containerRef.current?.scrollIntoView({
                block: "start",
                behavior: "instant" as ScrollBehavior,
            });

            // 주소창에는 항상 인코딩된 값만 표시
            const newUrl = `${window.location.pathname}?file=${encodeURIComponent(fileName)}`;
            if (replace) {
                window.history.replaceState({ file: fileName }, "", newUrl);
            } else {
                window.history.pushState({ file: fileName }, "", newUrl);
            }
        } catch (err) {
            console.error(err);
            alert("페이지를 불러올 수 없습니다.");
        }
    };

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
        let fileParam = params.get("file") || DEFAULT_FILE;

        // 반드시 디코딩
        try {
            fileParam = decodeURIComponent(fileParam);
        } catch {
            // 실패해도 무시
        }

        loadHtml(fileParam, true);
    }, [authReady, user, accessToken, navigate]);

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

            // 내부 파일 네비게이션
            e.preventDefault();
            const fileName = rawHref.split("/").pop() || rawHref;
            loadHtml(fileName);
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

            // 내부 파일 네비게이션
            e.preventDefault();
            const fileName = rawHref.split("/").pop() || rawHref;
            loadHtml(fileName);
        };


        shadow.addEventListener("click", handleClick);
        return () => shadow.removeEventListener("click", handleClick);
    }, [html]);

    // 뒤로가기
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const file = (e.state && e.state.file) as string | undefined;
            if (file) loadHtml(file, true);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    return (
        <div className="note-wrapper" style={{ width: "100%" }}>
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button className="refresh-button" onClick={() => {
                    navigate(`/note?file=${DEFAULT_FILE}`, { replace: true });
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