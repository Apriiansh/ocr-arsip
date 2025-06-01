export const PemindahanLoadingSkeleton = () => {
  return (
    <>
      {/* Header Skeleton (mimicking the one inside card-neon) */}
      <div className="bg-primary/10 px-6 py-4">
        {/* Title and Reset Button Skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 w-3/5 bg-primary/20 rounded animate-pulse"></div> {/* Title */}
          <div className="h-9 w-32 bg-primary/20 rounded-lg animate-pulse"></div> {/* Reset Button */}
        </div>
        {/* Stepper Skeleton */}
        <div className="mt-2 flex items-center">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse"></div>
                {step < 5 && (
                  <div className="h-1 w-20 bg-primary/20 mx-2 animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
          <div className="ml-4 h-5 w-28 bg-muted-foreground/20 rounded animate-pulse"></div> {/* Step Label */}
        </div>
      </div>

      {/* Main Content Area Skeleton (Generic for any step) */}
      {/* This part simulates the content area that changes with each step */}
      <div className="p-6 flex-grow flex flex-col space-y-6">
        {/* Title for the step content */}
        <div className="h-7 w-1/2 bg-muted rounded animate-pulse mb-2"></div>

        {/* Filters/Inputs (simulating search/filter bars or form inputs) */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="h-10 flex-1 bg-input rounded-lg animate-pulse"></div>
          <div className="h-10 w-full md:w-1/3 bg-input rounded-lg animate-pulse"></div>
        </div>

        {/* Table-like structure or form fields section */}
        <div className="border border-border/50 rounded-lg p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-muted/30 rounded animate-pulse"></div>
          ))}
        </div>
        {/* Another block to represent more complex forms or multiple sections */}
        <div className="border border-border/50 rounded-lg p-4 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/30 rounded animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons Skeleton */}
      <div className="flex justify-between items-center p-6 border-t border-border/50 mt-auto">
        <div className="h-10 w-28 bg-muted rounded-lg animate-pulse"></div> {/* Prev Button */}
        <div className="h-10 w-36 bg-primary/50 rounded-lg animate-pulse"></div> {/* Next/Submit Button */}
      </div>
    </>
  );
}; 