"use client";
import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAlihMediaForm } from "./hooks/useAlihMediaForm";
import { AlihMediaFormUI } from "./components/AlihMediaFormUI";
import { useAuth } from "@/context/AuthContext";
import Loading from "./loading";

function AlihMediaPageContent() {
    const searchParams = useSearchParams();
    const { user, isLoading: isAuthLoading, error: authError } = useAuth();
    const isiArsipId = searchParams.get('isiArsipId');
    const fileUrl = searchParams.get('fileUrl');

    const alihMedia = useAlihMediaForm({
        enabled: !isAuthLoading && !!user,
        isiArsipId,
        fileUrl,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alihMedia.handleSave();
    };

    if (isAuthLoading) return <Loading />;
    if (authError) return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {authError}</div>;
    if (!user) return <Loading />; 

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <AlihMediaFormUI {...alihMedia} handleSubmit={handleSubmit} handleCancel={() => window.history.back()} />
        </div>
    );
}

export default function AlihMediaArsipPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Memuat halaman alih media...</div>}>
            <AlihMediaPageContent />
        </Suspense>
    );
}