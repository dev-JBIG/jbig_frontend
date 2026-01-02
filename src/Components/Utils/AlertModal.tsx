import React, { useEffect, useRef } from 'react';
import './AlertModal.css';

interface AlertModalProps {
    show: boolean;
    message: string;
    onClose: () => void;
    title?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'danger';
    // Confirm 모드 옵션
    isConfirm?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ 
    show, 
    message, 
    onClose, 
    title = '알림',
    type = 'info',
    isConfirm = false,
    onConfirm,
    confirmText = '확인',
    cancelText = '취소'
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (show) {
            // 모달이 열릴 때 body에 modal-open 클래스 추가
            document.body.classList.add('modal-open');
            // 포커스를 모달로 이동
            modalRef.current?.focus();
        } else {
            // 모달이 닫힐 때 modal-open 클래스 제거
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [show]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [show, onClose]);

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    if (!show) return null;

    const getIconByType = () => {
        switch (type) {
            case 'success':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                );
            case 'warning':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                );
            case 'error':
            case 'danger':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                );
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                );
        }
    };

    const getColorByType = () => {
        switch (type) {
            case 'success':
                return { bg: '#f0f9ff', color: '#10b981' };
            case 'warning':
                return { bg: '#fffbeb', color: '#f59e0b' };
            case 'error':
            case 'danger':
                return { bg: '#fef2f2', color: '#ef4444' };
            default:
                return { bg: '#f0f4ff', color: '#4B61DD' };
        }
    };

    const iconStyle = getColorByType();

    return (
        <div 
            className="alert-modal-overlay"
            onClick={onClose}
            tabIndex={-1}
            role="dialog"
            aria-labelledby="alertModalLabel"
            aria-modal="true"
            ref={modalRef}
        >
            <div 
                className="alert-modal-card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="alert-modal-icon" style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}>
                    {getIconByType()}
                </div>

                <div className="alert-modal-title" id="alertModalLabel">{title}</div>
                <div className="alert-modal-desc">{message}</div>

                <div className="alert-modal-button-group">
                    {isConfirm ? (
                        <>
                            <button 
                                type="button" 
                                className="alert-modal-btn alert-modal-btn-secondary"
                                onClick={onClose}
                            >
                                {cancelText}
                            </button>
                            <button 
                                type="button" 
                                className={`alert-modal-btn alert-modal-btn-primary ${type === 'danger' ? 'alert-modal-btn-danger' : ''}`}
                                onClick={handleConfirm}
                                autoFocus
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button 
                            type="button" 
                            className="alert-modal-btn alert-modal-btn-primary"
                            onClick={onClose}
                            autoFocus
                        >
                            확인
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertModal;

