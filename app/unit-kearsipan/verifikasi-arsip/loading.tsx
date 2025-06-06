"use client";

import { LoadingSkeleton } from "./components/VerifikasiArsipSkeleton";

export default function Loading() {
  return (
    <div className="w-full h-full p-6">
        <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
            <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                <LoadingSkeleton /> 
            </div>
        </div>
    </div>
  );
}