"use client";

import { LoadingSkeleton } from "./components/VerifikasiArsipSkeleton";

export default function Loading() {
  return (
    <div className="w-full h-full p-6"> {/* Consistent page padding */}
        <div className="max-w-8xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
            <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                <LoadingSkeleton /> {/* LoadingSkeleton renders the inner parts of the card */}
            </div>
        </div>
    </div>
  );
}