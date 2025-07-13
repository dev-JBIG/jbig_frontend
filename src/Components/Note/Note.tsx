import React, { useEffect, useRef, useState } from "react";
import "./Note.css";

const Note: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
        window.location.reload();
    };

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const handleLoad = () => {
            try {
                const iframeWindow = iframe.contentWindow;
                const iframeDoc = iframe.contentDocument || iframeWindow?.document;
                if (!iframeWindow || !iframeDoc) return;

                const decodedPath = decodeURIComponent(iframeWindow.location.pathname).normalize("NFC");
                const ROOT_PATH = "/notion/JBIG 교안 (New) 1ad4d7781cdc803a9a5ef553af7782fe.html".normalize("NFC");

                if (decodedPath === ROOT_PATH) {
                    const detailsList = iframeDoc.querySelectorAll("details[open]");
                    detailsList.forEach((detail) => {
                        detail.removeAttribute("open");
                    });
                }
            } catch (err) {
                console.warn("iframe 접근 실패:", err);
            }
        };


        iframe.addEventListener("load", handleLoad);

        return () => {
            iframe.removeEventListener("load", handleLoad);
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
