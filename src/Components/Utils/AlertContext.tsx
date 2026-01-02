import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AlertModal from './AlertModal';

interface AlertOptions {
    message: string;
    title?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    onClose?: () => void;
}

interface ConfirmOptions {
    message: string;
    title?: string;
    type?: 'info' | 'warning' | 'danger';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface AlertContextType {
    showAlert: (options: AlertOptions | string) => void;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alertState, setAlertState] = useState<{
        show: boolean;
        message: string;
        title: string;
        type: 'info' | 'success' | 'warning' | 'error';
        onCloseCallback?: () => void;
    }>({
        show: false,
        message: '',
        title: '알림',
        type: 'info'
    });

    const [confirmState, setConfirmState] = useState<{
        show: boolean;
        message: string;
        title: string;
        type: 'info' | 'warning' | 'danger';
        confirmText: string;
        cancelText: string;
        onConfirmCallback?: () => void;
        onCancelCallback?: () => void;
        resolve?: (value: boolean) => void;
    }>({
        show: false,
        message: '',
        title: '확인',
        type: 'warning',
        confirmText: '확인',
        cancelText: '취소'
    });

    const showAlert = useCallback((options: AlertOptions | string) => {
        if (typeof options === 'string') {
            setAlertState({
                show: true,
                message: options,
                title: '알림',
                type: 'info'
            });
        } else {
            setAlertState({
                show: true,
                message: options.message,
                title: options.title || '알림',
                type: options.type || 'info',
                onCloseCallback: options.onClose
            });
        }
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                show: true,
                message: options.message,
                title: options.title || '확인',
                type: options.type || 'warning',
                confirmText: options.confirmText || '확인',
                cancelText: options.cancelText || '취소',
                onConfirmCallback: options.onConfirm,
                onCancelCallback: options.onCancel,
                resolve
            });
        });
    }, []);

    const handleAlertClose = useCallback(() => {
        if (alertState.onCloseCallback) {
            alertState.onCloseCallback();
        }
        setAlertState(prev => ({ ...prev, show: false }));
    }, [alertState.onCloseCallback]);

    const handleConfirmConfirm = useCallback(() => {
        if (confirmState.onConfirmCallback) {
            confirmState.onConfirmCallback();
        }
        if (confirmState.resolve) {
            confirmState.resolve(true);
        }
        setConfirmState(prev => ({ ...prev, show: false }));
    }, [confirmState.onConfirmCallback, confirmState.resolve]);

    const handleConfirmCancel = useCallback(() => {
        if (confirmState.onCancelCallback) {
            confirmState.onCancelCallback();
        }
        if (confirmState.resolve) {
            confirmState.resolve(false);
        }
        setConfirmState(prev => ({ ...prev, show: false }));
    }, [confirmState.onCancelCallback, confirmState.resolve]);

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <AlertModal
                show={alertState.show}
                message={alertState.message}
                title={alertState.title}
                type={alertState.type}
                onClose={handleAlertClose}
            />
            <AlertModal
                show={confirmState.show}
                message={confirmState.message}
                title={confirmState.title}
                type={confirmState.type}
                isConfirm={true}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                onConfirm={handleConfirmConfirm}
                onClose={handleConfirmCancel}
            />
        </AlertContext.Provider>
    );
};

export const useAlert = (): AlertContextType => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

