"use client"; 

import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

export default function Loading() {
    return (
        <div className="bg-background p-6 w-full h-full">
            <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center">
                <LoadingSkeleton />
            </div>
        </div>
    );
}