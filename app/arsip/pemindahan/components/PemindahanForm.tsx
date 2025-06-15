import React from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import { ArsipAktif, PemindahanInfo, ArsipEdit } from "../types";
import { formatDate, kodeKlasifikasiCompare } from "../utils"; // Impor formatDate dan kodeKlasifikasiCompare
import Input_ from "postcss/lib/input";

interface PemindahanFormProps {
    selectedArsip: ArsipAktif[]; // Asumsikan ArsipAktif dapat memiliki field seperti jenis_arsip_edited, inaktif_edited, nasib_akhir_edited
    pemindahanInfo: PemindahanInfo & { arsip_edits?: ArsipEdit[] };
    onChangePemindahanInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onArsipFieldChange: (arsipId: string, fieldName: 'jenis_arsip_edited' | 'masa_retensi_inaktif_edited' | 'nasib_akhir_edited' | 'nomor_boks_edited' | 'tingkat_perkembangan_edited', value: string | number) => void;
}

export function PemindahanForm({
    selectedArsip,
    pemindahanInfo,
    onChangePemindahanInfo,
    onArsipFieldChange
}: PemindahanFormProps) {
    // Urutkan selectedArsip secara global untuk penomoran yang konsisten di form
    const sortedSelectedArsip = [...selectedArsip].sort((a, b) => {
        const klasComparison = kodeKlasifikasiCompare(a.kode_klasifikasi, b.kode_klasifikasi);
        if (klasComparison !== 0) return klasComparison;

        // Kurun waktu bisa berupa string tahun "YYYY" atau rentang "YYYY-YYYY"
        // Untuk perbandingan sederhana, kita ambil tahun awal
        const kurunWaktuA = a.kurun_waktu.split('-')[0];
        const kurunWaktuB = b.kurun_waktu.split('-')[0];
        if (kurunWaktuA < kurunWaktuB) return -1;
        if (kurunWaktuA > kurunWaktuB) return 1;
        
        const numA = Number(a.nomor_berkas); // Nomor berkas asli
        const numB = Number(b.nomor_berkas); // Nomor berkas asli
        if (!isNaN(numA) && !isNaN(numB)) {
            if (numA < numB) return -1;
            if (numA > numB) return 1;
        } else {
            const nomorBerkasComparison = a.nomor_berkas.toString().localeCompare(b.nomor_berkas.toString());
            if (nomorBerkasComparison !== 0) return nomorBerkasComparison;
        }
        
        return a.id_arsip_aktif.localeCompare(b.id_arsip_aktif); // Final stable sort
    });

    // Fungsi untuk menghitung dan memformat periode inaktif
    const getPeriodeInaktifDisplay = (arsip: ArsipAktif): string => {
        const jangkaSimpanAktif = arsip.jangka_simpan; // Ini adalah periode aktif dari arsip_aktif, misal "01-01-2021 s.d. 31-12-2023"
        // Durasi inaktif diambil dari masa_retensi_inaktif_edited atau fallback ke retensi_data.inaktif
        const durasiInaktifTahun = (arsip as any).masa_retensi_inaktif_edited ?? arsip.retensi_data?.inaktif;
        if (!jangkaSimpanAktif || typeof durasiInaktifTahun !== 'number' || durasiInaktifTahun < 0) {
            return '-';
        }

        const parts = jangkaSimpanAktif.split(" s.d. ");
        const endDateAktifStrDMY = parts.length > 1 ? parts[1] : parts[0];

        if (!endDateAktifStrDMY) return '-';

        const dateParts = endDateAktifStrDMY.split("-");
        if (dateParts.length !== 3) return '-';

        const yearAktifEnd = parseInt(dateParts[2], 10);
        if (isNaN(yearAktifEnd)) return '-';

        const tahunMulaiInaktif = yearAktifEnd + 1;
        const tanggalMulaiInaktif = new Date(tahunMulaiInaktif, 0, 1); // 1 Januari

        const tahunBerakhirInaktif = tahunMulaiInaktif + durasiInaktifTahun - 1;
        const tanggalBerakhirInaktif = new Date(tahunBerakhirInaktif, 11, 31); // 31 Desember

        if (isNaN(tanggalMulaiInaktif.getTime()) || isNaN(tanggalBerakhirInaktif.getTime())) return '-';

        return `${formatDate(tanggalMulaiInaktif)} s.d. ${formatDate(tanggalBerakhirInaktif)}`;
    };
    return (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-primary">
                <FolderOpen size={20} /> Daftar Arsip yang Akan Dipindahkan
            </h3>
            <div className="overflow-x-auto mb-6 rounded-lg border border-border">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[5%]">No. Berkas</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kode Klasifikasi</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/5">Uraian Informasi</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/6">Jenis Arsip (Edit)</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kurun Waktu Penciptaan</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jangka Simpan Inaktif</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/12">Masa Retensi Inaktif (Thn)</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/12">Tingkat Perkembangan (Edit)</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/12">Nomor Boks (Edit)</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/6">Nasib Akhir (Edit)</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jumlah</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSelectedArsip.map((arsip, idx) => (
                            <tr key={arsip.id_arsip_aktif} className="even:bg-muted/20">
                                <td className="px-2 py-1 border text-center">{idx + 1}</td>
                                <td className="px-2 py-1 border">{arsip.kode_klasifikasi}</td>
                                <td className="px-2 py-1 border text-xs" title={arsip.uraian_informasi}>
                                    {arsip.uraian_informasi}
                                </td>
                                <td className="px-2 py-1 border">
                                    <input
                                        type="text" // Jenis Arsip
                                        value={(arsip as any).jenis_arsip_edited ?? arsip.retensi_data?.label ?? ""}
                                        onChange={(e) => onArsipFieldChange(arsip.id_arsip_aktif, 'jenis_arsip_edited', e.target.value)}
                                        className="w-full p-1.5 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        placeholder="-"
                                    />
                                </td>
                                <td className="px-2 py-1 border">{arsip.kurun_waktu || '-'}</td>
                                <td className="px-2 py-1 border">{getPeriodeInaktifDisplay(arsip)}</td>
                                <td className="px-2 py-1 border">
                                    <input
                                        type="number"
                                        value={(arsip as any).masa_retensi_inaktif_edited ?? arsip.retensi_data?.inaktif ?? ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            onArsipFieldChange(arsip.id_arsip_aktif, 'masa_retensi_inaktif_edited', val === "" ? "" : parseInt(val, 10));
                                        }}
                                        className="w-full p-1.5 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        placeholder="-"
                                        min="0"
                                    />
                                </td>
                                <td className="px-2 py-1 border">
                                    <input
                                        type="text"
                                        value={(arsip as any).tingkat_perkembangan_edited ?? pemindahanInfo.arsip_edits?.find(e => e.id_arsip_aktif === arsip.id_arsip_aktif)?.tingkat_perkembangan_edited ?? arsip.tingkat_perkembangan ?? ""}
                                        onChange={(e) => onArsipFieldChange(arsip.id_arsip_aktif, 'tingkat_perkembangan_edited', e.target.value)}
                                        className="w-full p-1.5 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                    />
                                </td>
                                <td className="px-2 py-1 border">
                                    <input
                                        type="text"
                                        value={(arsip as any).nomor_boks_edited ?? pemindahanInfo.arsip_edits?.find(e => e.id_arsip_aktif === arsip.id_arsip_aktif)?.nomor_boks_edited ?? ""}
                                        onChange={(e) => onArsipFieldChange(arsip.id_arsip_aktif, 'nomor_boks_edited', e.target.value)}
                                        className="w-full p-1.5 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        placeholder="No. Boks"
                                        required
                                    />
                                </td>
                                <td className="px-2 py-1 border">
                                    <select
                                        value={(arsip as any).nasib_akhir_edited ?? arsip.retensi_data?.nasib_akhir ?? ""}
                                        onChange={(e) => onArsipFieldChange(arsip.id_arsip_aktif, 'nasib_akhir_edited', e.target.value)}
                                        className="w-full p-1.5 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        required={!arsip.retensi_data?.nasib_akhir && !(arsip as any).nasib_akhir_edited}
                                    >
                                        <option value="">Pilih Nasib Akhir</option>
                                        <option value="Permanen">Permanen</option>
                                        <option value="Musnah">Musnah</option>
                                        <option value="Dinilai Kembali">Dinilai Kembali</option>
                                    </select>
                                </td>
                                <td className="px-2 py-1 border text-center">{arsip.jumlah || '-'}</td>
                                <td className="px-2 py-1 border">{arsip.keterangan || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 p-4 rounded-lg mb-6 flex items-start gap-3 shadow-sm">
                <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 " />
                <div>
                    <p className="font-medium">Perlu Diperhatikan:</p>
                    <p>Tentukan lokasi penyimpanan arsip inaktif yang sesuai dengan ketentuan. Pastikan nomor boks dan lokasi simpan diisi dengan benar untuk memudahkan temu kembali.</p>
                </div>
            </div>

            <h4 className="font-semibold mb-3 text-primary">Informasi Pemindahan Arsip Inaktif</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1">
                        Lokasi Simpan <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="lokasi_simpan"
                        value={pemindahanInfo.lokasi_simpan}
                        onChange={onChangePemindahanInfo}
                        className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1">
                        Kategori Arsip
                    </label>
                    <select
                        name="kategori_arsip"
                        value={pemindahanInfo.kategori_arsip}
                        onChange={onChangePemindahanInfo}
                        className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                        <option value="Arsip Konvensional">Arsip Konvensional</option>
                        <option value="Arsip Digital">Arsip Digital</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-1">
                        Keterangan
                    </label>
                    <textarea
                        name="keterangan"
                        value={pemindahanInfo.keterangan || ""}
                        onChange={onChangePemindahanInfo}
                        className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary h-auto"
                        rows={2}
                    />
                </div>
            </div>

            <div className="mt-6 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/30">
                <ul className="list-disc ml-5">
                    <li>Kolom <b>Jenis Arsip (Edit)</b>, <b>Masa Retensi Inaktif (Thn)</b>, <b>Tingkat Perkembangan (Edit)</b>, <b>Nomor Boks (Edit)</b>, dan <b>Nasib Akhir (Edit)</b> diisi otomatis dari data klasifikasi arsip atau data asli arsip jika tersedia (kecuali Nomor Boks).</li>
                    <li>Anda dapat mengubah nilai pada kolom-kolom tersebut jika diperlukan.</li>
                    <li>Perubahan akan disimpan dan digunakan saat proses pemindahan arsip.</li>
                    <li>Jika data klasifikasi tidak ditemukan untuk suatu arsip, Anda wajib mengisi kolom-kolom edit tersebut secara manual.</li>
                </ul>
            </div>
        </div>
    );
}