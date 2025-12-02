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

                // 2) HTML 파싱해서 리소스 상대 경로 → 절대 경로 변환
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

                // 이미지/미디어/스타일시트만 절대 경로로 변환 (a[href]는 원본 유지)
                tmpDoc.querySelectorAll<HTMLElement>("[src]").forEach((el) => absolutizeAttr(el, "src"));
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

                // 링크 새 탭에서 열리도록 보정 + data-href 보정
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

                    // Notion export에서 간혹 data-href만 있는 경우를 대비
                    root.querySelectorAll<HTMLAnchorElement>('a:not([href])[data-href]').forEach((a) => {
                        const dh = (a.getAttribute('data-href') || '').trim();
                        if (!dh) return;
                        a.setAttribute('href', dh);
                        a.setAttribute('target', '_blank');
                        const rel = a.getAttribute('rel') || '';
                        const wants = ["noopener", "noreferrer"];
                        const set = new Set(rel.split(/\s+/).filter(Boolean).concat(wants));
                        a.setAttribute('rel', Array.from(set).join(' '));
                    });
                };
                upgradeLinks(shadow);

                // 섀도우 루트 클릭 핸들러로 링크 열기 안정화 (팝업 차단 회피)
                const clickHandler = (e: Event) => {
                    const target = e.target as Element | null;
                    const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
                    if (!anchor) return;
                    const raw = (anchor.getAttribute('href') || anchor.getAttribute('data-href') || '').trim();
                    if (!raw || /^javascript:/i.test(raw)) return;

                    // 외부 링크는 새 탭으로 강제
                    if (/^https?:\/\//i.test(raw)) {
                        e.preventDefault();
                        window.open(raw, '_blank', 'noopener,noreferrer');
                        return;
                    }
                };
                (shadow as any).addEventListener('click', clickHandler);
                // 컴포넌트 언마운트/재주입 시 정리되도록 잠시 핸들러를 저장하지 않고, 재렌더 시 기존 shadow가 교체되면 GC됨
            } catch {
                // 수상경력 로드 실패 시 무시
            }
        })();

        return () => {
            stop = true;
        };
    }, []);

    return <div className="awards-container" ref={hostRef} />;
};
