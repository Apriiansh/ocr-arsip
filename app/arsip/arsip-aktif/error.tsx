'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <h2>Terjadi kesalahan!</h2>
            <button
                onClick={reset}
                className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
                Coba Lagi
            </button>
        </div>
    );
}