import React from 'react';

const NavbarLoadingSkeleton: React.FC = () => {
  return (
    <nav className="bg-primary text-primary-foreground border-b border-border shadow-sm sticky top-0 z-50 h-16 flex items-center">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center px-4 h-full w-full animate-pulse">
        {/* Logo Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-8 bg-primary/20 rounded-md"></div>
          <div className="h-6 w-24 bg-primary/20 rounded"></div>
        </div>

        {/* Desktop Menu Skeleton */}
        <div className="hidden md:flex flex-grow justify-center space-x-4 items-center px-8">
          <div className="h-8 w-24 bg-primary/20 rounded-md"></div>
          <div className="h-8 w-28 bg-primary/20 rounded-md"></div>
          <div className="h-8 w-32 bg-primary/20 rounded-md"></div>
        </div>

        {/* Right side Skeleton (Notifications and User) */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="h-8 w-8 bg-primary/20 rounded-full"></div> {/* Notification icon skeleton */}
          <div className="h-8 w-24 bg-primary/20 rounded-md"></div> {/* User button skeleton */}
        </div>

        {/* Mobile Menu Button Skeleton */}
        <div className="md:hidden h-8 w-8 bg-primary/20 rounded-md"></div>
      </div>
    </nav>
  );
};

export default NavbarLoadingSkeleton;