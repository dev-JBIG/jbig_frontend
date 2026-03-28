import React, { useState, useEffect } from "react";
import { fetchActivePopups, PopupItem } from "../../API/req";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "./PopupSlider.css";

const POPUP_HIDE_UNTIL_KEY = "jbig-popup-hide-until";

const PopupSlider: React.FC = () => {
    const [popups, setPopups] = useState<PopupItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hideFor3Days, setHideFor3Days] = useState(false);

    useEffect(() => {
        // 기존 방식의 localStorage 키 제거 (마이그레이션)
        localStorage.removeItem("jbig-popup-closed");
        loadPopups();
    }, []);

    const loadPopups = async () => {
        try {
            const data = await fetchActivePopups();
            console.log('[PopupSlider] Fetched popups:', data);
            
            // localStorage에서 "3일 동안 보지 않기" 타임스탬프 확인
            const hideUntilStr = localStorage.getItem(POPUP_HIDE_UNTIL_KEY);
            if (hideUntilStr) {
                const hideUntil = parseInt(hideUntilStr);
                console.log('[PopupSlider] Hide until:', new Date(hideUntil), 'Now:', new Date());
                if (Date.now() < hideUntil) {
                    // 아직 숨김 기간이 유효하면 팝업을 보여주지 않음
                    console.log('[PopupSlider] Hiding popups due to 3-day setting');
                    setIsLoading(false);
                    return;
                } else {
                    // 기간이 지났으면 localStorage에서 제거
                    console.log('[PopupSlider] 3-day period expired, clearing');
                    localStorage.removeItem(POPUP_HIDE_UNTIL_KEY);
                }
            }
            
            setPopups(data);
            
            if (data.length > 0) {
                setIsVisible(true);
                console.log('[PopupSlider] Showing popup');
            } else {
                console.log('[PopupSlider] No active popups to show');
            }
        } catch (err) {
            console.error('[PopupSlider] Failed to fetch popups:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // "3일 동안 보지 않기" 옵션이 체크되어 있으면
        if (hideFor3Days) {
            // 3일 후 타임스탬프 계산 (밀리초 단위)
            const threeDaysLater = Date.now() + (3 * 24 * 60 * 60 * 1000);
            localStorage.setItem(POPUP_HIDE_UNTIL_KEY, threeDaysLater.toString());
            console.log('[PopupSlider] Set hide until:', new Date(threeDaysLater));
        }
        // 체크하지 않으면 현재 세션에서만 닫힘 (localStorage에 저장하지 않음)
        
        setIsVisible(false);
        console.log('[PopupSlider] Popup closed, hideFor3Days:', hideFor3Days);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? popups.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === popups.length - 1 ? 0 : prev + 1));
    };

    if (isLoading || !isVisible || popups.length === 0) {
        return null;
    }

    const currentPopup = popups[currentIndex];

    return (
        <div className="popup-container">
            <div className="popup-header">
                <h3 className="popup-title">{currentPopup.title}</h3>
                <button className="popup-close-btn" onClick={handleClose} aria-label="닫기">
                    <X size={20} />
                </button>
            </div>

            <div className="popup-content">
                {currentPopup.image_url && (
                    <div className="popup-image">
                        <img 
                            src={currentPopup.image_url} 
                            alt={currentPopup.title}
                            onError={(e) => {
                                console.error('[PopupSlider] Failed to load image:', currentPopup.image_url);
                                // 이미지 로드 실패 시 이미지 영역 숨기기
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                    parent.style.display = 'none';
                                }
                            }}
                        />
                    </div>
                )}
                {currentPopup.content && (
                    <div className="popup-text">
                        {currentPopup.content.split('\n').map((line, idx) => (
                            <p key={idx}>{line || '\u00A0'}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className="popup-footer">
                <div className="popup-footer-checkbox">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={hideFor3Days}
                            onChange={(e) => setHideFor3Days(e.target.checked)}
                        />
                        <span>3일 동안 보지 않기</span>
                    </label>
                </div>
                
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
