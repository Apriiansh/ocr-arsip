// app/user-manual/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Play, BookOpen, CheckCircle, Info } from 'lucide-react';
import { getManualContent, getAllManualSlugs, ManualContent } from '@/lib/manual'; 
import SafeImage from '@/components/SafeImage'; // Impor komponen SafeImage
import { use } from 'react';

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default function ManualDetailPage({ params: paramPromise }: PageProps) {
    const params = use(paramPromise);
    const content = getManualContent(params.slug);

    if (!content) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-primary shadow-sm border-b border-border rounded-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center h-16"> 
                        <div className="flex items-center gap-2">
                            <BookOpen className="text-primary-foreground" />
                            <h1 className="text-xl font-bold text-center text-primary-foreground">Panduan Detail</h1> 
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Title Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-4">{content.title}</h1>
                        <p className="text-lg text-muted-foreground">{content.description}</p>
                    </div>

                    {/* Video Tutorial Section */}
                    {content.videoUrl && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-2">
                                <Play className="w-6 h-6" />
                                Video Tutorial
                            </h2>
                            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                                <video
                                    controls
                                    className="w-full h-auto max-h-96"
                                    poster={content.videoThumbnail}
                                >
                                    <source src={content.videoUrl} type="video/mp4" />
                                    Browser Anda tidak mendukung pemutar video.
                                </video>
                            </div>
                        </section>
                    )}

                    {/* Steps Section */}
                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6" />
                            Langkah-langkah Detail
                        </h2>
                        <div className="space-y-8">
                            {content.steps.map((step, index) => (
                                <div key={index} className="bg-card border border-border rounded-lg p-6 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-semibold text-foreground mb-3">
                                                {step.title}
                                            </h3>
                                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                                {step.content}
                                            </p>

                                            {/* Step Image */}
                                            {step.image && (
                                                <SafeImage
                                                    src={step.image}
                                                    alt={`Langkah ${index + 1}: ${step.title}`}
                                                    className="w-full max-w-md rounded-lg border border-border shadow-sm mb-4" // Pindahkan mb-4 ke sini
                                                />
                                            )}

                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* General Tips Section */}
                    {content.generalTips && content.generalTips.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-2">
                                <Info className="w-6 h-6" />
                                Tips Umum
                            </h2>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-sm">
                                <ul className="space-y-2">
                                    {content.generalTips.map((tip, tipIndex) => (
                                        <li key={tipIndex} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                <CheckCircle size={16} className="text-blue-500" />
                                            </div>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                    {/* Related Links */}
                    {content.relatedLinks && content.relatedLinks.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-semibold text-primary mb-6">
                                Panduan Terkait
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {content.relatedLinks.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={`/user-manual/${link.slug}`}
                                        className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow duration-200 group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                            <span className="text-foreground group-hover:text-primary transition-colors">
                                                {link.title}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Back to Manual Button */}
                    <div className="text-center">
                        <Link
                            href="/user-manual"
                            className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground rounded-md transition-colors"
                        >
                            Kembali ke Daftar Panduan
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Generate static params untuk semua slug yang tersedia
export function generateStaticParams() {
    return getAllManualSlugs().map((slug) => ({
        slug: slug,
    }));
}