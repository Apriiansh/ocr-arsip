import { FileText, Info } from "lucide-react";
import { BeritaAcara } from "../types";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface BeritaAcaraFormProps {
    beritaAcara: BeritaAcara;
    selectedArsipCount: number;
    userBidangId: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function BeritaAcaraForm({
    beritaAcara,
    selectedArsipCount,
    userBidangId,
    onChange
}: BeritaAcaraFormProps) {
    const [namaBidang, setNamaBidang] = useState<string>("");
    const supabase = createClient();

    useEffect(() => {
        const fetchBidangName = async () => {
            if (!userBidangId) return;

            const { data, error } = await supabase
                .from("daftar_bidang")
                .select("nama_bidang")
                .eq("id_bidang", userBidangId)
                .single();

            if (error) {
                console.error("Error fetching bidang name:", error);
                return;
            }

            if (data) {
                setNamaBidang(data.nama_bidang);
            }
        };

        fetchBidangName();
    }, [userBidangId]);

    return (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                <FileText size={20} /> Berita Acara Pemindahan Arsip
            </h3>

            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-500 p-4 rounded-lg mb-6 flex items-start gap-3 shadow-sm">
                <Info size={20} className="mt-0.5 flex-shrink-0 " />
                <div>
                    <p className="font-medium">Informasi Penting:</p>
                    <p>Berita acara ini akan menjadi dokumen resmi yang menjadi dasar pemindahan {selectedArsipCount} arsip aktif ke penyimpanan inaktif.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 pr-0 md:pr-3"> {/* Add some right padding on medium screens */}
                    <div>
                        <label htmlFor="nomor_berita_acara" className="block text-sm font-medium mb-1">
                            Nomor Berita Acara <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="nomor_berita_acara"
                            name="nomor_berita_acara"
                            value={beritaAcara.nomor_berita_acara}
                            onChange={onChange}
                            placeholder="Contoh: BA-PA/001/V/2025"
                            className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="tanggal_berita_acara" className="block text-sm font-medium mb-1">
                            Tanggal Berita Acara <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="tanggal_berita_acara"
                            name="tanggal_berita_acara"
                            value={beritaAcara.tanggal_berita_acara}
                            onChange={onChange}
                            className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="dasar" className="block text-sm font-medium mb-1">
                            Dasar Pemindahan
                        </label>
                        <input
                            type="text"
                            id="dasar"
                            name="dasar"
                            value={beritaAcara.dasar}
                            onChange={onChange}
                            className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>

                <div className="space-y-4 pl-0 md:pl-3"> {/* Add some left padding on medium screens */}
                    <label htmlFor="keterangan" className="block text-sm font-medium mb-1">
                        Keterangan Tambahan
                    </label>
                    <textarea
                        id="keterangan"
                        name="keterangan"
                        value={beritaAcara.keterangan}
                        onChange={onChange}
                        rows={6}
                        placeholder="Berikan keterangan mengenai pemindahan arsip ini jika diperlukan..."
                        className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary h-auto"
                    />
                </div>
            </div>

            <div className="mt-6 p-4 bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-lg shadow-md">
                <h4 className="font-medium mb-2">Ringkasan Arsip yang Dipindahkan:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Jumlah Arsip: <span className="font-medium">{selectedArsipCount} berkas</span></div>
                    <div>Dari Bidang: <span className="font-medium">{namaBidang || "Memuat..."}</span></div>
                </div>
            </div>
        </div>
    );
} 