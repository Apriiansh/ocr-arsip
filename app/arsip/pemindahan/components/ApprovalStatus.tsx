import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, XCircle } from "lucide-react";
import { formatDate } from "../utils";
import { ApprovalStatus as IApprovalStatus, BeritaAcara, PemindahanInfo, ProcessStatus, ArsipEdit } from "../types";

interface ApprovalStatusProps {
    approvalStatus: { // Diperbarui untuk mencerminkan struktur objek
        kepala_bidang: {
            status: "Menunggu" | "Disetujui" | "Ditolak";
            verified_by?: string | null; // Opsional karena mungkin belum diverifikasi
            verified_at?: string | null; // Opsional
        };
        sekretaris: {
            status: "Menunggu" | "Disetujui" | "Ditolak";
            verified_by?: string | null; // Opsional
            verified_at?: string | null; // Opsional
        };
    };
    processStatus: ProcessStatus;
    beritaAcara: BeritaAcara;
    pemindahanInfo: PemindahanInfo & { arsip_edits?: ArsipEdit[] };
    selectedArsipCount: number;
}

export function ApprovalStatus({
    approvalStatus,
    processStatus,
    beritaAcara,
    pemindahanInfo,
    selectedArsipCount
}: ApprovalStatusProps) {
    // Determine alert status info
    const renderProcessAlert = () => {
        if (processStatus.status === 'idle') {
            return null;
        }
        
        if (processStatus.status === 'processing') {
            return (
                <div className="mb-6 flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg shadow-sm">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Sedang memproses pemindahan arsip...</span>
                </div>
            );
        }
        
        if (processStatus.status === 'completed') {
            return (
                <div className="mb-6 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg shadow-sm">
                    <CheckCircle2 size={20} />
                    <span>Arsip berhasil dipindahkan! Silakan lanjutkan ke langkah berikutnya.</span>
                </div>
            );
        }
        
        if (processStatus.status === 'error') {
            return (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg shadow-sm">
                    <AlertCircle size={20} />
                    <div>
                        <p className="font-medium">Terjadi kesalahan saat memproses pemindahan:</p>
                        <p className="text-sm">{processStatus.message || 'Silakan coba lagi atau hubungi administrator.'}</p>
                    </div>
                </div>
            );
        }
        
        return null;
    };

    const getUniqueBoxNumbers = () => {
        if (!pemindahanInfo.arsip_edits || pemindahanInfo.arsip_edits.length === 0) {
            return "N/A";
        }
        const boxNumbers = pemindahanInfo.arsip_edits
            .map(edit => edit.nomor_boks_edited)
            .filter(Boolean); // Filter out undefined or empty strings
        return Array.from(new Set(boxNumbers)).join(", ") || "N/A";
    };
    
    return (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Status Persetujuan</h3>

            {/* Process Status Alert */}
            {renderProcessAlert()}

            {/* Approval Status */}
            <div className="space-y-4">
                <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-lg p-4 shadow-md">
                    <h4 className="font-semibold mb-2">Kepala Bidang:</h4>
                    <div className={`flex items-center gap-2 ${
                        approvalStatus.kepala_bidang.status === "Disetujui" ? "text-green-600" :
                        approvalStatus.kepala_bidang.status === "Ditolak" ? "text-red-600" :
                        "text-yellow-600"
                    }`}>
                        {approvalStatus.kepala_bidang.status === "Disetujui" ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                        ) : approvalStatus.kepala_bidang.status === "Ditolak" ? (
                            <XCircle size={18} className="text-red-600" />
                        ) : (
                            <Clock size={18} className="text-yellow-600" />
                        )}
                        {approvalStatus.kepala_bidang.status}
                    </div>
                </div>

                <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-lg p-4 shadow-md">
                    <h4 className="font-semibold mb-2">Sekretaris:</h4>
                    <div className={`flex items-center gap-2 ${
                        approvalStatus.sekretaris.status === "Disetujui" ? "text-green-600" :
                        approvalStatus.sekretaris.status === "Ditolak" ? "text-red-600" :
                        "text-yellow-600"
                    }`}>
                        {approvalStatus.sekretaris.status === "Disetujui" ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                        ) : approvalStatus.sekretaris.status === "Ditolak" ? (
                            <XCircle size={18} className="text-red-600" />
                        ) : (
                            <Clock size={18} className="text-yellow-600" />
                        )}
                        {approvalStatus.sekretaris.status}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 bg-muted/40 dark:bg-muted/20 p-4 rounded-lg border border-border/40 shadow-md">
                <h4 className="font-semibold mb-2">Ringkasan Pemindahan:</h4>
                <div className="space-y-2 text-sm">
                    <p>Jumlah Arsip: {selectedArsipCount} berkas</p>
                    <p>Nomor Berita Acara: {beritaAcara.nomor_berita_acara}</p>
                    <p>Lokasi Penyimpanan: {pemindahanInfo.lokasi_simpan}</p>
                    <p>Nomor Boks: {getUniqueBoxNumbers()}</p>
                </div>
            </div>
        </div>
    );
} 