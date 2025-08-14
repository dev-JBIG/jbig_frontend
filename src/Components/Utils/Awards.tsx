import React, { useEffect, useRef } from "react";
import { fetchAwardsHtml } from "../../API/req";

export const AwardsSection: React.FC = () => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let stop = false;
        let mo: MutationObserver | null = null;

        (async () => {
            try {
                const html = await fetchAwardsHtml();
                if (stop || !hostRef.current) return;

                const shadow =
                    hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: "open" });

                shadow.innerHTML = `
          ${html}
          <style>
            :host { display:block; width:100%; }
          </style>
        `;

                // 함수: 모든 링크 새 탭에서 열리게 보정
                const upgradeLinks = (root: ParentNode) => {
                    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a => {
                        const href = (a.getAttribute('href') || '').trim();
                        if (!href || /^javascript:/i.test(href)) return; // 위험/무효 href 제외
                        a.setAttribute('target', '_blank');
                        const rel = a.getAttribute('rel') || '';
                        const wants = ['noopener', 'noreferrer'];
                        const set = new Set(rel.split(/\s+/).filter(Boolean).concat(wants));
                        a.setAttribute('rel', Array.from(set).join(' '));
                    });
                };

                upgradeLinks(shadow);

            } catch (e) {
                console.error("수상경력 불러오기 실패:", e);
            }
        })();

        return () => {
            stop = true;
            mo?.disconnect();
        };
    }, []);

    return <div className="awards-container" ref={hostRef} />;
};
