import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

type FitHTMLProps = {
    html: string;            // 이미 로드된 HTML 문자열
    className?: string;
};

export const FitHTML: React.FC<FitHTMLProps> = ({ html, className }) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const recalc = () => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const iw = inner.scrollWidth || 1;
        const ih = inner.scrollHeight || 1;

        const ow = outer.clientWidth || 1;

        // 가로 기준 스케일
        const s = ow / iw;

        setScale(Number.isFinite(s) && s > 0 ? s : 1);

        // 스케일 반영한 높이로 컨테이너 높이 설정 (비율 유지)
        outer.style.height = `${ih * s}px`;
    };

    // HTML 주입 후 측정
    useLayoutEffect(() => {
        if (!innerRef.current) return;
        innerRef.current.innerHTML = DOMPurify.sanitize(html || "");

        const imgs = innerRef.current.querySelectorAll("img");
        imgs.forEach((img) => img.addEventListener("load", recalc, { once: true }));

        requestAnimationFrame(recalc);

        return () => {
            imgs.forEach((img) => img.removeEventListener("load", recalc));
        };
    }, [html]);

    // 리사이즈 대응
    useEffect(() => {
        const ro = new ResizeObserver(recalc);
        if (outerRef.current) ro.observe(outerRef.current);
        window.addEventListener("resize", recalc);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recalc);
        };
    }, []);

    return (
        <div
            ref={outerRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",     // 부모 칸이 높이를 가져야 함
                overflow: "hidden",
            }}
        >
            <div
                ref={innerRef}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left", // 좌상단 기준 스케일
                    display: "inline-block",
                }}
            />
        </div>
    );
};
