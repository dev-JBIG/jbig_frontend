// Components/Utils/Awards.tsx
import React, { useEffect, useRef } from "react";
import axios from "axios";
import { fetchAwardsHtml } from "../../API/req";

const MAX_WIDTH = 790;

export const AwardsSection: React.FC = () => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let stop = false;

        (async () => {
            try {
                // 1) 서버에서 파일 "링크(URL 문자열)"을 받는다
                const fileUrl = await fetchAwardsHtml();
                if (stop || !hostRef.current) return;

                // 2) 링크로부터 HTML 본문을 가져온다 (X-Frame-Options 회피: iframe 미사용)
                const res = await axios.get<string>(fileUrl, {
                    headers: { Accept: "text/html" },
                    responseType: "text",
                    withCredentials: false,
                });
                let html = res.data || "";

                // 3) 상대경로(이미지/스타일/링크)를 절대경로로 변환
                const baseHref = new URL(".", fileUrl).toString(); // 파일이 있는 디렉토리
                const tmpDoc = document.implementation.createHTMLDocument("awards");
                tmpDoc.body.innerHTML = html;

                const absolutizeAttr = (el: Element, attr: "src" | "href") => {
                    const raw = el.getAttribute(attr);
                    if (!raw) return;
                    try {
                        // data:, mailto:, tel: 등은 그대로 둔다
                        if (/^(data:|mailto:|tel:|javascript:)/i.test(raw)) return;
                        const abs = new URL(raw, baseHref).toString();
                        el.setAttribute(attr, abs);
                    } catch {
                        /* ignore */
                    }
                };

                tmpDoc.querySelectorAll<HTMLElement>("[src]").forEach((el) => absolutizeAttr(el, "src"));
                tmpDoc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((el) => absolutizeAttr(el, "href"));
                tmpDoc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((el) =>
                    absolutizeAttr(el, "href")
                );

                // (안전) script 제거
                tmpDoc.querySelectorAll("script").forEach((s) => s.remove());

                html = tmpDoc.body.innerHTML;

                // 4) Shadow DOM에 격리 주입 + article 중앙정렬
                const shadow =
                    hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: "open" });

                shadow.innerHTML = `
          ${html}
          <style>
            :host { display:block; width:100%; }

            /* Notion export의 article을 가로 중앙 + 최대폭 제한 */
            article.page, article[class~="page"]{
              width: min(100%, ${MAX_WIDTH}px);
              margin: 0 auto;
              padding: 0 8px;
              box-sizing: border-box;
            }

            /* 가로 넘침 방지 */
            article.page *{
              box-sizing: border-box;
              max-width: 100%;
              min-width: 0;
              word-break: keep-all;
              overflow-wrap: anywhere;
            }

            /* 미디어/표 */
            article.page img, article.page video, article.page canvas, article.page svg{
              display: block;
              max-width: 100%;
              height: auto;
            }
            article.page table{
              display: block;
              width: 100%;
              overflow-x: auto;
              border-collapse: collapse;
            }
          </style>
        `;

                // 5) 링크는 새 탭에서 열리게
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
