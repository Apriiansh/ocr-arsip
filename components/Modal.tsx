// d:\Project\end\ocr-arsip\app\components\Modal.tsx
"use client";

import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};
