"use client";
import React, { useState } from "react";
import { FileText, Upload, ScanSearch, Plus, Minus, Save, Eye, EyeOff, FilePlus2, ArrowUp, ArrowDown } from "lucide-react";
import { SuratAlihMediaData } from "../types";
import { PDFViewer } from "@react-pdf/renderer";
import { AlihMediaPDF } from "./AlihMediaPDF";

interface Props {
    data: SuratAlihMediaData;
    handleChange: <K extends keyof SuratAlihMediaData>(key: K, value: SuratAlihMediaData[K]) => void;
    pdfFile: File | null;
    pdfPreviewUrl: string | null;
    ocrLoading: boolean;
    submitting?: boolean;
    handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleOcr: () => void;
    handleIsiChange: (idx: number, value: string) => void;
    addIsiParagraph: () => void;
    removeIsiParagraph: (idx: number) => void;
    handleSubmit?: (e: React.FormEvent) => void;
    handleCancel?: () => void;
}

export const AlihMediaFormUI: React.FC<Props> = ({
    data,
    handleChange,
    pdfFile,
    pdfPreviewUrl,
    ocrLoading,
    submitting = false,
    handlePdfUpload,
    handleOcr,
    handleIsiChange,
    addIsiParagraph,
    removeIsiParagraph,
    handleSubmit,
    handleCancel
}) => {
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [showDigitalPreview, setShowDigitalPreview] = useState(false);

    // State untuk preview signature upload
    const [signaturePreview, setSignaturePreview] = useState<string | null>(data.qrUrl || null);

    const pdfFileName = pdfFile ? pdfFile.name : "Tidak ada file dipilih";

    // Handler pindah urutan paragraf
    const moveParagraph = (idx: number, dir: "up" | "down") => {
        const isi = [...data.isi];
        if (dir === "up" && idx > 0) {
            [isi[idx - 1], isi[idx]] = [isi[idx], isi[idx - 1]];
            handleChange("isi", isi);
        } else if (dir === "down" && idx < isi.length - 1) {
            [isi[idx], isi[idx + 1]] = [isi[idx + 1], isi[idx]];
            handleChange("isi", isi);
        }
    };

    // Handler upload file signature
    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSignaturePreview(url);
            handleChange("qrUrl", url);
        }
    };
    // Handler input URL signature
    const handleSignatureUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSignaturePreview(e.target.value);
        handleChange("qrUrl", e.target.value);
    };

    return (
        <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto card-neon rounded-2xl overflow-hidden">
                <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
                    <h2 className="text-3xl font-bold text-primary-foreground flex items-center gap-2">
                        <FileText size={36} /> Alih Media Surat
                    </h2>
                    <div className="text-sm text-primary-foreground/80">
                        OCR Scan & Edit
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    {/* Bagian Unggah Dokumen & Preview */}
                    <div className="mb-8">
                        <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                            <h3 className="text-lg font-semibold text-accent-foreground mb-4 flex items-center gap-2">
                                <Upload size={20} /> Unggah Dokumen PDF
                            </h3>
                            <div>
                                <label htmlFor="pdfUploadInput" className="block text-foreground font-medium mb-2">
                                    Upload File PDF untuk OCR
                                </label>
                                <input
                                    id="pdfUploadInput"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handlePdfUpload}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                    disabled={submitting || ocrLoading}
                                />
                            </div>

                            {pdfFile && (
                                <div className="mt-4 flex flex-col items-center bg-background p-4 rounded-lg border border-border">
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText size={24} className="text-muted-foreground" />
                                            <span className="font-medium text-sm truncate max-w-[200px]">{pdfFileName}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPdfPreview(!showPdfPreview)}
                                            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                                        >
                                            {showPdfPreview ? (
                                                <>
                                                    <EyeOff size={16} /> Tutup Preview
                                                </>
                                            ) : (
                                                <>
                                                    <Eye size={16} /> Lihat PDF
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {showPdfPreview && pdfPreviewUrl && (
                                        <div className="w-full mb-4 border border-border rounded-lg overflow-hidden">
                                            <object
                                                data={pdfPreviewUrl}
                                                type="application/pdf"
                                                className="w-full h-64"
                                            >
                                                <p className="text-destructive p-4">Gagal menampilkan PDF. Pastikan file valid dan browser mendukung preview PDF.</p>
                                            </object>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleOcr}
                                        disabled={ocrLoading || submitting}
                                        className="mt-2 bg-secondary text-secondary-foreground py-2 px-5 rounded-lg hover:bg-secondary/80 transition font-medium flex items-center gap-2 disabled:bg-muted"
                                    >
                                        {ocrLoading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-secondary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Memproses OCR...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ScanSearch size={18} /> Proses OCR
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Digitalisasi PDF */}
                    <div className="mb-8">
                        <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-accent-foreground flex items-center gap-2">
                                    <FilePlus2 size={20} /> Preview Arsip Digitalisasi (PDF hasil)
                                </h3>
                                <button
                                    type="button"
                                    className="text-primary flex gap-1 items-center text-sm hover:text-primary/80"
                                    onClick={() => setShowDigitalPreview(!showDigitalPreview)}
                                >
                                    {showDigitalPreview ? (
                                        <>
                                            <EyeOff size={15} /> Tutup Preview
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={15} /> Lihat Preview
                                        </>
                                    )}
                                </button>
                            </div>
                            {showDigitalPreview && (
                                <div className="w-full border border-border rounded-lg overflow-hidden bg-background" style={{ height: 500 }}>
                                    <PDFViewer width="100%" height="100%" showToolbar>
                                        <AlihMediaPDF data={data} />
                                    </PDFViewer>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Kolom Kiri - Header dan Identitas Surat */}
                        <div className="space-y-6">
                            {/* Identitas Instansi */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                                <h4 className="text-md font-semibold text-foreground mb-3">Identitas Instansi</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Pemerintahan</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nama instansi utama"
                                                value={data.instansi1}
                                                onChange={e => handleChange("instansi1", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Nama Instansi</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nama instansi kedua"
                                                value={data.instansi2}
                                                onChange={e => handleChange("instansi2", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-foreground font-medium mb-2">Alamat</label>
                                        <input
                                            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                            placeholder="Alamat lengkap instansi"
                                            value={data.alamat}
                                            onChange={e => handleChange("alamat", e.target.value)}
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Kontak</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nomor telepon/fax"
                                                value={data.kontak}
                                                onChange={e => handleChange("kontak", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Email/Website</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Email atau website"
                                                value={data.emailWeb}
                                                onChange={e => handleChange("emailWeb", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Surat */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                                <h4 className="text-md font-semibold text-foreground mb-3">Detail Surat</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Tanggal</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="DD/MM/YYYY"
                                                value={data.tanggal}
                                                onChange={e => handleChange("tanggal", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Nomor Surat</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nomor surat"
                                                value={data.nomor}
                                                onChange={e => handleChange("nomor", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Sifat</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Biasa/Rahasia/dst"
                                                value={data.sifat}
                                                onChange={e => handleChange("sifat", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Lampiran</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Jumlah lampiran"
                                                value={data.lampiran}
                                                onChange={e => handleChange("lampiran", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Hal</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Perihal surat"
                                                value={data.hal}
                                                onChange={e => handleChange("hal", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tujuan Surat */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                                <h4 className="text-md font-semibold text-foreground mb-3">Tujuan Surat</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-foreground font-medium mb-2">Kepada</label>
                                        <input
                                            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                            placeholder="Nama penerima surat"
                                            value={data.kepada}
                                            onChange={e => handleChange("kepada", e.target.value)}
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-foreground font-medium mb-2">Kota</label>
                                        <input
                                            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                                            placeholder="Kota tujuan"
                                            value={data.di}
                                            onChange={e => handleChange("di", e.target.value)}
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kolom Kanan - Isi Surat dan Tanda Tangan */}
                        <div className="space-y-6">
                            {/* Isi Surat */}
                            <div>
                                <h4 className="text-md font-semibold text-foreground mb-3">Isi Surat</h4>
                                <div className="space-y-3">
                                    {data.isi.map((paragraf, index) => (
                                        <div key={index} className="relative flex items-start gap-2">
                                            <div className="flex flex-col gap-1 mr-2 mt-7">
                                                <button type="button" onClick={() => moveParagraph(index, "up")}
                                                    className="text-primary disabled:opacity-30" disabled={index === 0}>
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button type="button" onClick={() => moveParagraph(index, "down")}
                                                    className="text-primary disabled:opacity-30" disabled={index === data.isi.length - 1}>
                                                    <ArrowDown size={16} />
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-foreground font-medium mb-2">
                                                    Paragraf {index + 1}
                                                </label>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground h-24 resize-vertical"
                                                        placeholder={`Isi paragraf ${index + 1}...`}
                                                        value={paragraf}
                                                        onChange={e => handleIsiChange(index, e.target.value)}
                                                        disabled={submitting}
                                                    />
                                                    {data.isi.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeIsiParagraph(index)}
                                                            className="self-start mt-1 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                            disabled={submitting}
                                                            title="Hapus paragraf"
                                                        >
                                                            <Minus size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addIsiParagraph}
                                        className="w-full py-2 px-4 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                                        disabled={submitting}
                                    >
                                        <Plus size={16} /> Tambah Paragraf
                                    </button>
                                </div>
                            </div>

                            {/* Penutup */}
                            <div>
                                <label className="block text-foreground font-medium mb-2">Penutup</label>
                                <textarea
                                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground h-24 resize-vertical"
                                    placeholder="Kalimat penutup surat..."
                                    value={data.penutup}
                                    onChange={e => handleChange("penutup", e.target.value)}
                                    disabled={submitting}
                                />
                            </div>

                            {/* Tanda Tangan */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                                <h4 className="text-md font-semibold text-foreground mb-3">Tanda Tangan</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Jabatan</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Jabatan penandatangan"
                                                value={data.ttdJabatan}
                                                onChange={e => handleChange("ttdJabatan", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Nama</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nama penandatangan"
                                                value={data.ttdNama}
                                                onChange={e => handleChange("ttdNama", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">Pangkat</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Pangkat/golongan"
                                                value={data.ttdPangkat}
                                                onChange={e => handleChange("ttdPangkat", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-foreground font-medium mb-2">NIP</label>
                                            <input
                                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground"
                                                placeholder="Nomor Induk Pegawai"
                                                value={data.ttdNip}
                                                onChange={e => handleChange("ttdNip", e.target.value)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-foreground font-medium mb-2">URL/Upload TTE</label>
                                        <input
                                            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus-border-ring bg-input text-foreground placeholder-muted-foreground mb-2"
                                            placeholder="URL QR code atau tanda tangan digital"
                                            value={data.qrUrl || ""}
                                            onChange={handleSignatureUrlChange}
                                            disabled={submitting}
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block w-full mb-2"
                                            onChange={handleSignatureUpload}
                                            disabled={submitting}
                                        />
                                        {signaturePreview && (
                                            <img src={signaturePreview} alt="Signature Preview" className="max-h-32 border rounded shadow mt-2" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-10 flex justify-end space-x-3">
                        {handleCancel && (
                            <button
                                type="button"
                                onClick={submitting ? undefined : handleCancel}
                                className="bg-muted text-muted-foreground py-3 px-6 rounded-lg hover:bg-muted/80 transition font-medium"
                                disabled={submitting}
                            >
                                Batal
                            </button>
                        )}

                        {handleSubmit && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary text-primary-foreground py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-70"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} /> Simpan Alih Media
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};