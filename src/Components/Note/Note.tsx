// Components/Note/Note.tsx
import React, { useEffect, useRef, useState } from "react";
import "./Note.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../Utils/UserContext";
import { fetchNotionHtml } from "../../API/req";

const Note: React.FC = () => {
    const { user, authReady, accessToken } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [html, setHtml] = useState<string>("");

    const handleRefresh = () => window.location.reload();

    useEffect(() => {
        if (!authReady) return;
        if (!user || !accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
        }
    }, [authReady, user, accessToken, navigate]);

    const search = new URLSearchParams(location.search);
    const file = search.get("file") || "";

    useEffect(() => {
        if (!file || !accessToken) return;
        let cancelled = false;
        (async () => {
            try {
                const text = await fetchNotionHtml(file, accessToken);
                if (!cancelled) setHtml(text);
            } catch {
                alert("노션 문서를 불러올 수 없습니다.");
            }
        })();
        return () => { cancelled = true; };
    }, [file, accessToken]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        iframe.setAttribute("scrolling", "no");
        iframe.style.overflow = "hidden";

        const resizeToContent = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) return;
                const h1 = doc.documentElement?.scrollHeight || 0;
                const h2 = doc.body?.scrollHeight || 0;
                const next = Math.max(h1, h2);
                if (next && iframe.style.height !== `${next}px`) {
                    iframe.style.height = `${next}px`;
                }
            } catch {}
        };

        const handleLoad = () => {
            resizeToContent();
            try {
                const win = iframe.contentWindow;
                const doc = iframe.contentDocument || win?.document;
                if (!win || !doc) return;

                // 모든 링크 새 탭
                doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a => {
                    const href = (a.getAttribute('href') || '').trim();
                    if (!href || /^javascript:/i.test(href)) return;
                    a.setAttribute('target', '_blank');
                    const rel = a.getAttribute('rel') || '';
                    const set = new Set(rel.split(/\s+/).filter(Boolean).concat(['noopener','noreferrer']));
                    a.setAttribute('rel', Array.from(set).join(' '));
                });

                // 레이아웃 변화 관찰
                doc.addEventListener("toggle", resizeToContent, true);
                const ro = new ResizeObserver(resizeToContent);
                ro.observe(doc.documentElement);
                ro.observe(doc.body);

                const mo = new MutationObserver(resizeToContent);
                mo.observe(doc.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    characterData: true,
                });

                doc.addEventListener("load", resizeToContent, true);
                const onOuterResize = () => resizeToContent();
                window.addEventListener("resize", onOuterResize);

                const cleanup = () => {
                    try {
                        doc.removeEventListener("toggle", resizeToContent, true);
                        doc.removeEventListener("load", resizeToContent, true);
                        window.removeEventListener("resize", onOuterResize);
                        mo.disconnect();
                        ro.disconnect();
                    } catch {}
                };

                (iframe as any)._cleanup = cleanup;
            } catch {}
        };

        iframe.addEventListener("load", handleLoad);
        return () => {
            iframe.removeEventListener("load", handleLoad);
            (iframe as any)._cleanup?.();
        };
    }, [html]);

    return (
        <div className="note-wrapper">
            <div className="note-header">
                <a href="/" className="note-logo">JBIG</a>
                <button className="refresh-button" onClick={handleRefresh}>새로고침</button>
            </div>
            <iframe
                ref={iframeRef}
                title="Notion"
                className="note-iframe"
                srcDoc={html}
            />
        </div>
    );
};

export default Note;
