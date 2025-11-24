import React, { useLayoutEffect, useRef } from "react";
import DOMPurify from "dompurify";

type FitHTMLProps = {
    html: string;
    className?: string;
    allowUpScale?: boolean; // 기본 false
};

export const FitHTML: React.FC<FitHTMLProps> = ({ html, className }) => {
    const innerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!innerRef.current) return;
        innerRef.current.innerHTML = DOMPurify.sanitize(html || "", {
            ADD_ATTR: ["style", "class"],
        });
    }, [html]);

    return (
        <div
            className={className}
            style={{
                width: "100%",
                display: "flex",
                justifyContent: "center", // 화면 기준 가운데
                overflowX: "hidden",
            }}
        >
            <div
                ref={innerRef}
                style={{
                    width: 790,                // 본문 폭 고정
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                }}
            />
        </div>
    );
};
