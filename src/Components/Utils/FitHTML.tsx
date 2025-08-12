import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
            ADD_ATTR: ["style"], // font-size 유지
        });
    }, [html]);

    return (
        <div
            className={className}
            style={{
                width: "100%",
                overflowX: "auto", // 폭 넘치면 스크롤
            }}
        >
            <div
                ref={innerRef}
                style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    whiteSpace: "normal",
                }}
            />
        </div>
    );
};

