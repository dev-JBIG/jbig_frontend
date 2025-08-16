import React, { useEffect, useRef, useState } from "react";
import "./Note.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchNotionHtml } from "../../API/req";

const MEDIA_BASE = "http://211.188.54.115:3001/media/notion/";

const Note: React.FC = () => {
    const { user, authReady, accessToken } = useUser();
    const navigate = useNavigate();
    const [html, setHtml] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    // 초기 로드: 서버가 주는 HTML 그대로 표시
    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const raw = await fetchNotionHtml(accessToken);
                if (!cancelled) setHtml(raw);
            } catch {
                alert("문서를 불러올 수 없습니다.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authReady, user, accessToken, navigate]);

    // 내부 내비게이션: /...html → MEDIA_BASE + ... 로 붙여서 div 안에만 로드
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleClick = (e: Event) => {
            const target = e.target as Element | null;
            const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
            if (!anchor) return;

            const rawHref = anchor.getAttribute("href") || "";
            if (!rawHref || /^javascript:/i.test(rawHref)) return;

            // 기준: MEDIA_BASE
            // - 절대경로 "/foo.html" → MEDIA_BASE + "/foo.html"
            // - 상대경로 "foo.html"   → MEDIA_BASE + "foo.html"
            // - 이미 절대URL이면(new URL) 그대로 사용
            let finalUrl: string;
            try {
                // new URL(href, base) 가 모든 경우(절대/상대/루트) 처리
                finalUrl = new URL(rawHref, MEDIA_BASE).toString();
            } catch {
                return; // 이상한 URL이면 무시
            }

            // MEDIA_BASE 아래로만 가로채기 (외부 링크는 기본 동작)
            if (!finalUrl.startsWith(MEDIA_BASE)) return;

            e.preventDefault();

            fetch(finalUrl, { credentials: "include" })
                .then((res) => {
                    if (!res.ok) throw new Error(`Failed: ${res.status}`);
                    return res.text();
                })
                .then((data) => {
                    setHtml(data); // div 내용만 교체
                    // 필요하면 스크롤 상단으로
                    el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
                })
                .catch(() => {
                    alert("페이지를 불러올 수 없습니다.");
                });
        };

        el.addEventListener("click", handleClick);
        return () => el.removeEventListener("click", handleClick);
    }, [html]);

    return (
        <div className="note-wrapper" style={{ width: "100%" }}>
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button className="refresh-button" onClick={() => window.location.reload()}>
                    새로고침
                </button>
            </div>

            {/* 여기만 교체 */}
            <div
                ref={containerRef}
                className="note-html"
                style={{ width: "100%" }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
};

export default Note;
