import React, { useCallback, useState, useEffect, useRef } from "react";
import { fetchActivePopups, PopupItem, fetchPostDetail, createComment, dismissPopup } from "../../API/req";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUser } from "./UserContext";
import "./PopupSlider.css";
import scheduleIdleTask from "./scheduleIdleTask";

const AUTO_CONGRATS_IMAGE_PATH = "/JBIG-Congratulation.png";
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp)$/i;

const extractCongratsPostTitle = (popup: PopupItem): string => {
    const rawContent = popup.content || "";
    const titleLine = rawContent
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.startsWith("제목:"));

    if (titleLine) {
        const extracted = titleLine.replace(/^제목:\s*/, "").trim();
        if (extracted) {
            return extracted;
        }
    }

    const fallbackTitle = popup.title.replace(/^축하해주세요!\s*/, "").trim();
    return fallbackTitle || popup.title;
};

const PopupSlider: React.FC = () => {
    const [popups, setPopups] = useState<PopupItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [congratsLine, setCongratsLine] = useState("");
    const [closeError, setCloseError] = useState("");
    const [isClosing, setIsClosing] = useState(false);
    const [postContent, setPostContent] = useState<string | null>(null);
    const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
    const [contentLoading, setContentLoading] = useState(false);
    const { accessToken, authReady } = useUser();
    const mountedRef = useRef(false);
    const postContentSeqRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadPostContent = useCallback(async (postId: number) => {
        const seq = ++postContentSeqRef.current;
        setContentLoading(true);
        setPostImageUrl(null);
        try {
            const data = await fetchPostDetail(postId, accessToken);
            if (!mountedRef.current || seq !== postContentSeqRef.current) return;
            if (data && !data.unauthorized && !data.notFound) {
                setPostContent(data.content_md || "");
                const attachments = data.attachment_paths || [];
                const firstImage = attachments.find((a: { url: string; name: string }) =>
                    IMAGE_EXTENSIONS.test(a.url || a.name)
                );
                setPostImageUrl(firstImage ? firstImage.url : null);
            } else {
                setPostContent(null);
            }
        } catch {
            if (!mountedRef.current || seq !== postContentSeqRef.current) return;
            setPostContent(null);
        } finally {
            if (mountedRef.current && seq === postContentSeqRef.current) {
                setContentLoading(false);
            }
        }
    }, [accessToken]);

    useEffect(() => {
        if (!authReady) return;
        let cancelled = false;

        const loadPopups = async () => {
            try {
                const data = await fetchActivePopups(accessToken);
                if (cancelled || !mountedRef.current) return;

                // 비로그인: 축하 팝업 제외
                const filtered = accessToken
                    ? data
                    : data.filter((popup: PopupItem) => !popup.auto_generated && !popup.source_post_id);

                setPopups(filtered);

                if (filtered.length > 0) {
                    setIsVisible(true);
                    const first = filtered[0];
                    if (first.source_post_id) {
                        loadPostContent(first.source_post_id);
                    }
                }
            } catch (err) {
                console.error('[PopupSlider] Failed to fetch popups:', err);
            }
        };

        const cancelLoad = scheduleIdleTask(loadPopups, { timeout: 2500, fallbackDelayMs: 1300 });
        return () => {
            cancelled = true;
            cancelLoad();
        };
    }, [authReady, accessToken, loadPostContent]);

    const removeCurrentPopup = () => {
        const remaining = popups.filter((_, i) => i !== currentIndex);
        setPopups(remaining);
        if (remaining.length === 0) {
            setIsVisible(false);
        } else if (currentIndex >= remaining.length) {
            setCurrentIndex(remaining.length - 1);
        }
        setCongratsLine("");
        setCloseError("");
        setPostContent(null);
        setPostImageUrl(null);
    };

    const handleClose = () => {
        const popup = popups[currentIndex];
        if (!popup) return;
        if (accessToken && popup.id) {
            dismissPopup(popup.id, accessToken).catch(() => {});
        }
        removeCurrentPopup();
    };

    const handleSubmitCongrats = async () => {
        const popup = popups[currentIndex];
        if (!popup) return;

        const message = congratsLine.trim();
        if (!message) {
            setCloseError("축하 한마디를 입력해주세요.");
            return;
        }

        setIsClosing(true);

        if (accessToken && popup.id) {
            dismissPopup(popup.id, accessToken).catch(() => {});
        }

        if (popup.source_post_id && accessToken) {
            try {
                await createComment(
                    popup.source_post_id,
                    { content: message, parent: null, is_anonymous: true },
                    accessToken
                );
            } catch (err) {
                console.error('[PopupSlider] Failed to create congratulation comment:', err);
            }
        }

        setIsClosing(false);
        removeCurrentPopup();
    };

    const handlePrev = () => {
        setPostContent(null);
        setPostImageUrl(null);
        const newIndex = currentIndex === 0 ? popups.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        const popup = popups[newIndex];
        if (popup?.source_post_id) {
            loadPostContent(popup.source_post_id);
        }
    };

    const handleNext = () => {
        setPostContent(null);
        setPostImageUrl(null);
        const newIndex = currentIndex === popups.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
        const popup = popups[newIndex];
        if (popup?.source_post_id) {
            loadPostContent(popup.source_post_id);
        }
    };

    if (!isVisible || popups.length === 0) {
        return null;
    }

    const currentPopup = popups[currentIndex];
    const requiresCongrats = Boolean(currentPopup.auto_generated || currentPopup.source_post_id);
    const postTitle = requiresCongrats ? extractCongratsPostTitle(currentPopup) : null;
    const displayImageSrc = requiresCongrats
        ? (postImageUrl || AUTO_CONGRATS_IMAGE_PATH)
        : currentPopup.image_url;

    return (
        <div className="popup-container">
            <div className="popup-header">
                <h3 className="popup-title">{requiresCongrats ? "축하해주세요!" : currentPopup.title}</h3>
                <button
                    className="popup-close-btn"
                    onClick={handleClose}
                    aria-label="닫기"
                    disabled={isClosing}
                >
                    <X size={20} />
                </button>
            </div>

            <div className="popup-content">
                {displayImageSrc && (
                    <div className="popup-image">
                        <img
                            src={displayImageSrc}
                            alt={currentPopup.title}
                            onError={(e) => {
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) parent.style.display = 'none';
                            }}
                        />
                    </div>
                )}
                {requiresCongrats ? (
                    <div className="popup-text">
                        <h4 className="popup-post-title">{postTitle}</h4>
                        {contentLoading && <p className="popup-content-loading">불러오는 중...</p>}
                        {postContent !== null && (
                            <div className="popup-post-body">
                                <ReactMarkdown>{postContent}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ) : (
                    currentPopup.content && (
                        <div className="popup-text">
                            {currentPopup.content.split('\n').map((line, idx) => (
                                <p key={idx}>{line || '\u00A0'}</p>
                            ))}
                        </div>
                    )
                )}
            </div>

            <div className="popup-footer">
                {requiresCongrats && (
                    <div className="popup-congrats-box">
                        <input
                            id="popup-congrats-input"
                            type="text"
                            value={congratsLine}
                            maxLength={120}
                            placeholder="축하 한마디를 남겨주세요!"
                            onChange={(e) => {
                                setCongratsLine(e.target.value);
                                if (closeError) setCloseError("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmitCongrats();
                            }}
                        />
                        {closeError && (
                            <p className="popup-congrats-error">{closeError}</p>
                        )}
                        <button
                            className="popup-congrats-submit-btn"
                            onClick={handleSubmitCongrats}
                            disabled={isClosing}
                        >
                            축하의 한마디 남기기
                        </button>
                    </div>
                )}

                {popups.length > 1 && (
                    <div className="popup-footer-nav">
                        <button className="popup-nav-btn" onClick={handlePrev} aria-label="이전">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="popup-indicator">
                            {currentIndex + 1} / {popups.length}
                        </span>
                        <button className="popup-nav-btn" onClick={handleNext} aria-label="다음">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PopupSlider;
