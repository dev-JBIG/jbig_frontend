import React, { useState, useEffect } from "react";
import { fetchActivePopups, PopupItem } from "../../API/req";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "./PopupSlider.css";

const POPUP_CLOSED_KEY = "jbig-popup-closed";

const PopupSlider: React.FC = () => {
    const [popups, setPopups] = useState<PopupItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPopups();
    }, []);

    const loadPopups = async () => {
        try {
            const data = await fetchActivePopups();
            
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
        // 현재 팝업 ID를 localStorage에 저장
        if (popups.length > 0) {
            const currentPopupId = popups[currentIndex].id;
            const closedPopupsStr = localStorage.getItem(POPUP_CLOSED_KEY);
            const closedPopups: number[] = closedPopupsStr ? JSON.parse(closedPopupsStr) : [];
            
            if (!closedPopups.includes(currentPopupId)) {
                closedPopups.push(currentPopupId);
                localStorage.setItem(POPUP_CLOSED_KEY, JSON.stringify(closedPopups));
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

                {popups.length > 1 && (
                    <div className="popup-footer">
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
        </>
    );
};

export default PopupSlider;
