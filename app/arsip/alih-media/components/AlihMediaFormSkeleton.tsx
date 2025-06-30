"use client";
import React from 'react';

const SkeletonBox = ({ className }: { className?: string }) => (
    <div className={`bg-muted-foreground/20 rounded animate-pulse ${className}`}></div>
);

export default function AlihMediaFormSkeleton() {
    return (
        <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto card-neon rounded-2xl overflow-hidden">
                {/* Header Skeleton */}
                <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
                    <SkeletonBox className="h-9 w-1/3" />
                </div>

                <div className="p-8">
                    {/* Upload Section Skeleton */}
                    <div className="mb-8">
                        <div className="bg-muted/40 p-6 rounded-xl border border-border/40">
                            <SkeletonBox className="h-7 w-1/4 mb-4" />
                            <SkeletonBox className="h-5 w-1/5 mb-2" />
                            <SkeletonBox className="h-11 w-full" />
                        </div>
                    </div>

                    {/* Preview Section Skeleton */}
                    <div className="mb-8">
                        <div className="bg-muted/40 p-6 rounded-xl border border-border/40">
                            <SkeletonBox className="h-7 w-1/3 mb-3" />
                            <SkeletonBox className="h-10 w-32" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column Skeleton */}
                        <div className="space-y-6">
                            {/* Identitas Instansi Skeleton */}
                            <div className="bg-muted/40 p-4 rounded-xl border border-border/40">
                                <SkeletonBox className="h-6 w-1/3 mb-4" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                    <SkeletonBox className="h-11 w-full" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                </div>
                            </div>
                            {/* Detail Surat Skeleton */}
                            <div className="bg-muted/40 p-4 rounded-xl border border-border/40">
                                <SkeletonBox className="h-6 w-1/4 mb-4" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column Skeleton */}
                        <div className="space-y-6">
                            {/* Isi Surat Skeleton */}
                            <div>
                                <SkeletonBox className="h-6 w-1/4 mb-3" />
                                <div className="space-y-3">
                                    <SkeletonBox className="h-24 w-full" />
                                    <SkeletonBox className="h-10 w-full border-2 border-dashed" />
                                </div>
                            </div>
                            {/* Penutup Skeleton */}
                            <div>
                                <SkeletonBox className="h-5 w-1/5 mb-2" />
                                <SkeletonBox className="h-24 w-full" />
                            </div>
                            {/* Tanda Tangan Skeleton */}
                            <div className="bg-muted/40 p-4 rounded-xl border border-border/40">
                                <SkeletonBox className="h-6 w-1/3 mb-4" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <SkeletonBox className="h-11" />
                                        <SkeletonBox className="h-11" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Skeleton */}
                    <div className="mt-10 flex justify-end space-x-3">
                        <SkeletonBox className="h-12 w-24 rounded-lg" />
                        <SkeletonBox className="h-12 w-40 rounded-lg bg-primary/50" />
                    </div>
                </div>
            </div>
        </div>
    );
}