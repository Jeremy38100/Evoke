
import React, { createContext, useContext } from 'react';
import { Toaster, toast } from 'react-hot-toast';

interface ToastContextValue {
    showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const showToast = (message: string) => {
        toast(message);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toaster /> {/* Render the Toaster component from react-hot-toast */}
        </ToastContext.Provider>
    );
}
