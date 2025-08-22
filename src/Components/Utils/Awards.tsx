import React, { useEffect, useRef } from "react";
import { fetchAwardsHtml } from "../../API/req";

const MAX_WIDTH = 900;

export const AwardsSection: React.FC = () => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let stop = false;

        (async () => {
            try {
                // 1) 서버에서 HTML 문자열 그대로 받기
                const htmlString = await fetchAwardsHtml();
                if (stop || !hostRef.current) return;

                // 2) HTML 파싱해서 상대 경로 → 절대 경로 변환
                const tmpDoc = document.implementation.createHTMLDocument("awards");
                tmpDoc.body.innerHTML = htmlString;

                const absolutizeAttr = (el: Element, attr: "src" | "href") => {
                    const raw = el.getAttribute(attr);
                    if (!raw) return;
                    try {
                        if (/^(data:|mailto:|tel:|javascript:)/i.test(raw)) return;
                        const abs = new URL(raw, window.location.origin).toString();
                        el.setAttribute(attr, abs);
                    } catch {
                        /* ignore */
                    }
                };

                tmpDoc.querySelectorAll<HTMLElement>("[src]").forEach((el) =>
                    absolutizeAttr(el, "src")
                );
                tmpDoc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((el) =>
                    absolutizeAttr(el, "href")
                );
                tmpDoc
                    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
                    .forEach((el) => absolutizeAttr(el, "href"));

                // script 제거
                tmpDoc.querySelectorAll("script").forEach((s) => s.remove());

                const cleanedHtml = tmpDoc.body.innerHTML;

                // 3) shadow DOM에 주입
                const shadow =
                    hostRef.current.shadowRoot ??
                    hostRef.current.attachShadow({ mode: "open" });

                shadow.innerHTML = `
          ${cleanedHtml}
          <style>
            :host { display:block; width:100%; }

            /* Notion export의 article을 가로 중앙 + 최대폭 제한 */
            article.page, article[class~="page"] {
              width: min(100%, ${MAX_WIDTH}px);
              margin: 0 auto;
              padding: 0 8px;
              box-sizing: border-box;
              white-space: pre-wrap; /* 원본 개행 보존 */
              transform-origin: top left; /* scale 대응 */
            }

            /* 가로 넘침 방지 */
            article.page * {
              box-sizing: border-box;
              max-width: 100%;
              min-width: 0;
              word-break: keep-all;
              overflow-wrap: anywhere;
            }

            /* 미디어/표 */
            article.page img,
            article.page video,
            article.page canvas,
            article.page svg {
              display: block;
              max-width: 100%;   /* 부모보다 크면 줄어듦 */
              width: auto;       /* 원본 크기 유지 */
              height: auto;      /* 비율 유지 */
              margin: 0 auto;    /* 중앙 정렬 */
            }
            article.page table {
              display: block;
              width: 100%;
              overflow-x: auto;
              border-collapse: collapse;
            }
          </style>
        `;

                // 링크 새 탭에서 열리도록 보정
                const upgradeLinks = (root: ParentNode) => {
                    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
                        const href = (a.getAttribute("href") || "").trim();
                        if (!href || /^javascript:/i.test(href)) return;
                        a.setAttribute("target", "_blank");
                        const rel = a.getAttribute("rel") || "";
                        const wants = ["noopener", "noreferrer"];
                        const set = new Set(rel.split(/\s+/).filter(Boolean).concat(wants));
                        a.setAttribute("rel", Array.from(set).join(" "));
                    });
                };
                upgradeLinks(shadow);
            } catch (e) {
                console.error("수상경력 불러오기 실패:", e);
            }
        })();

        return () => {
            stop = true;
        };
    }, []);

    return <div className="awards-container" ref={hostRef} />;
};
