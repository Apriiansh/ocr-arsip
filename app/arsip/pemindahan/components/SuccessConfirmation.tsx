import { CheckCircle2, FolderOpen, Plus, History, FileText } from "lucide-react";
import { BeritaAcara, PemindahanInfo } from "../types";
import { useRouter } from "next/navigation";

interface SuccessConfirmationProps {
    selectedArsipCount: number;
    beritaAcara: BeritaAcara;
    pemindahanInfo: PemindahanInfo;
    onReset: () => void;
    // onDownloadPDF: () => void; // Dihapus karena tidak lagi digunakan
}

export function SuccessConfirmation({
    selectedArsipCount,
    beritaAcara,
    pemindahanInfo,
    onReset,
    // onDownloadPDF // Dihapus
}: SuccessConfirmationProps) {
    const router = useRouter();

    return (
        <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-primary">Pemindahan Arsip Berhasil!</h3>
            <p className="text-muted-foreground mb-6">
                {selectedArsipCount} arsip telah berhasil dipindahkan ke penyimpanan inaktif.
            </p>

            <div className="max-w-md mx-auto p-4 bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-lg text-left mb-8 shadow-md"> {/* Increased bottom margin */}
                <h4 className="font-semibold mb-3 text-foreground">Detail Pemindahan:</h4> {/* Increased bottom margin */}
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Nomor Berita Acara:</span>
                        <span className="font-medium text-foreground">{beritaAcara.nomor_berita_acara}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tanggal:</span>
                        <span className="font-medium">{beritaAcara.tanggal_berita_acara}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Lokasi Inaktif:</span>
                        <span className="font-medium text-foreground">{pemindahanInfo.lokasi_simpan}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Nomor Boks:</span>
                        <span className="font-medium text-foreground">{pemindahanInfo.nomor_boks}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4"> {/* Use flex-col on small screens */}
                <button
                    onClick={() => router.push("/arsip/arsip-inaktif/daftar-inaktif")}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200"
                >
                    <FolderOpen size={18} />
                    Lihat Arsip Inaktif
                </button>
                <button
                    onClick={() => router.push("/arsip/pemindahan/riwayat")}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200"
                >
                    <History size={18} />
                    Riwayat Pemindahan
                </button>
                <button
                    onClick={onReset}
                    className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200"
                >
                    <Plus size={18} />
                    Pemindahan Baru
                </button>
            </div>
        </div>
    );
} 