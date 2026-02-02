import React, { useState, useEffect } from "react";
import { fetchActivePopups, PopupItem } from "../../API/req";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "./PopupSlider.css";

const POPUP_CLOSED_KEY = "jbig-popup-closed";
const POPUP_HIDE_UNTIL_KEY = "jbig-popup-hide-until";

const PopupSlider: React.FC = () => {
    const [popups, setPopups] = useState<PopupItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hideFor3Days, setHideFor3Days] = useState(false);

    useEffect(() => {
        loadPopups();
    }, []);

    const loadPopups = async () => {
        try {
            const data = await fetchActivePopups();
            
            // localStorage에서 "3일 동안 보지 않기" 타임스탬프 확인
            const hideUntilStr = localStorage.getItem(POPUP_HIDE_UNTIL_KEY);
            if (hideUntilStr) {
                const hideUntil = parseInt(hideUntilStr);
                if (Date.now() < hideUntil) {
                    // 아직 숨김 기간이 유효하면 팝업을 보여주지 않음
                    setIsLoading(false);
                    return;
                }
            }
            
            // localStorage에서 닫은 팝업 ID 목록 가져오기
            const closedPopupsStr = localStorage.getItem(POPUP_CLOSED_KEY);
            const closedPopups: number[] = closedPopupsStr ? JSON.parse(closedPopupsStr) : [];
            
            // 닫지 않은 팝업만 필터링
            const activePopups = data.filter(popup => !closedPopups.includes(popup.id));
            
            setPopups(activePopups);
            
            if (activePopups.length > 0) {
                setIsVisible(true);
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
        } else {
            // 체크되지 않았으면 현재 팝업만 닫음 처리
            if (popups.length > 0) {
                const currentPopupId = popups[currentIndex].id;
                const closedPopupsStr = localStorage.getItem(POPUP_CLOSED_KEY);
                const closedPopups: number[] = closedPopupsStr ? JSON.parse(closedPopupsStr) : [];
                
                if (!closedPopups.includes(currentPopupId)) {
                    closedPopups.push(currentPopupId);
                    localStorage.setItem(POPUP_CLOSED_KEY, JSON.stringify(closedPopups));
                }
            }
        }
        
        setIsVisible(false);
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
        <>
            <div className="popup-overlay" onClick={handleClose} />
            <div className="popup-container">
                <div className="popup-header">
                    <h3 className="popup-title">{currentPopup.title}</h3>
                    <button className="popup-close-btn" onClick={handleClose} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                <div className="popup-content">
                    {currentPopup.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line || '\u00A0'}</p>
                    ))}
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
        </>
    );
};

export default PopupSlider;
