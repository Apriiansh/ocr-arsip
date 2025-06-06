"use client";

import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="bg-background w-full flex-grow flex flex-col">
        <div className="max-w-screen-2xl mx-auto w-full flex-grow flex flex-col items-center justify-center p-6">
            <LoadingSkeleton />
        </div>
    </div>
  );
}