"use client"

import React from 'react';

export const LoadingSkeleton = () => {
    return (
        <div className="bg-background p-8 space-y-10 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card p-6 rounded-xl shadow-md border border-border">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-muted rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 w-48 bg-muted rounded mb-2"></div>
                                <div className="h-8 w-16 bg-muted rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-md border border-border">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-6 h-6 bg-muted rounded-full"></div>
                        <div className="h-6 w-48 bg-muted rounded"></div>
                    </div>
                    <div className="h-[300px] bg-muted/30 rounded-lg"></div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-6 h-6 bg-muted rounded-full"></div>
                        <div className="h-6 w-32 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="p-4 bg-muted/10 rounded-lg border border-border/30">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-4 bg-muted rounded w-3/5"></div>
                                        <div className="h-3 bg-muted rounded w-full"></div> 
                                        <div className="h-3 bg-muted rounded w-2/5 mt-1"></div>
                                    </div>
                                    <div className="h-5 bg-muted rounded-full w-20"></div>
                                </div>
                                <div className="h-3 bg-muted rounded w-1/4 mt-2.5"></div>
                            </div>
                        ))}
                    </div>
                    <div className="h-4 w-40 bg-muted rounded mt-6 mx-auto"></div> 
                </div>
            </div>
        </div>
    );
}; 