import React, { useEffect, useRef, useState } from "react";
import "./Note.css";
import {useNavigate} from "react-router-dom";
import {useUser} from "../Utils/UserContext";

const Note: React.FC = () => {
    const { user, authReady } = useUser();
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
        window.location.reload();
    };

    useEffect(() => {
        if (!authReady) return;
        if (!user) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
        }
    }, [authReady, user, navigate]);


    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        // iframe 자체 스크롤바 비활성화
        iframe.setAttribute("scrolling", "no"); // 일부 브라우저
        iframe.style.overflow = "hidden";       // 보조

        const resizeToContent = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) return;
                // 문서 전체 높이를 기준으로 iFrame 높이 갱신
                const h1 = doc.documentElement?.scrollHeight || 0;
                const h2 = doc.body?.scrollHeight || 0;
                const next = Math.max(h1, h2);
                if (next && iframe.style.height !== `${next}px`) {
                    iframe.style.height = `${next}px`;
                }
            } catch (e) {
                // cross-origin이면 접근 불가
                // 지금은 같은 도메인(/notion/...)이므로 OK
            }
        };

        const handleLoad = () => {
            // 최초 로드 시 한번 맞추고
            resizeToContent();

            try {
                const win = iframe.contentWindow;
                const doc = iframe.contentDocument || win?.document;
                if (!win || !doc) return;

                // <details> 토글 변화 반영
                doc.addEventListener("toggle", resizeToContent, true);

                // 레이아웃 변화(폰트 로드, 이미지 로드 등) 감지
                let ro: ResizeObserver;
                if ((win as any).ResizeObserver) {
                    ro = new (win as any).ResizeObserver(resizeToContent);
                } else {
                    ro = new ResizeObserver(resizeToContent);
                }
                ro.observe(doc.documentElement);
                ro.observe(doc.body);

                // DOM 변경(열림/닫힘, 동적 삽입 등) 감지
                const mo = new MutationObserver(resizeToContent);
                mo.observe(doc.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    characterData: true,
                });

                // 이미지/리소스 지연 로딩 대비
                doc.addEventListener("load", resizeToContent, true);

                // 윈도 리사이즈에도 반응
                const onOuterResize = () => resizeToContent();
                window.addEventListener("resize", onOuterResize);

                // cleanup
                const cleanup = () => {
                    try {
                        doc.removeEventListener("toggle", resizeToContent, true);
                        doc.removeEventListener("load", resizeToContent, true);
                        window.removeEventListener("resize", onOuterResize);
                        mo.disconnect();
                        ro.disconnect?.();
                    } catch {}
                };

                // iFrame이 다시 로드될 때(경로 바뀌거나 새로 로드) cleanup 필요
                iframe.addEventListener("beforeunload", cleanup);
                // on unmount
                (iframe as any)._cleanup = cleanup;
            } catch {}
        };

        iframe.addEventListener("load", handleLoad);
        return () => {
            iframe.removeEventListener("load", handleLoad);
            (iframe as any)._cleanup?.();
        };
    }, []);

    return (
        <div className="note-wrapper">
            <div className="note-header">
                <a href="/" className="note-logo">
                    JBIG
                </a>
                <button className="refresh-button" onClick={handleRefresh}>
                    새로고침
                </button>
            </div>
            <iframe
                ref={iframeRef}
                src="/notion/JBIG 교안 (New) 1ad4d7781cdc803a9a5ef553af7782fe.html"
                title="Notion"
                className="note-iframe"
            />
        </div>
    );
};

export default Note;
