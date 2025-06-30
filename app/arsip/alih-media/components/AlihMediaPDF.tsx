import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { SuratAlihMediaData } from "../types";

// Interface untuk data tabel
interface TableRowData {
    nama?: string;
    nim?: string;
    judulPenelitian?: string;
}

// Extend interface untuk SuratAlihMediaData jika belum ada tableData
interface ExtendedSuratAlihMediaData extends SuratAlihMediaData {
    tableData?: TableRowData[];
}

Font.register({
    family: 'Arial',
    src: '/fonts/arial.ttf',
});

const styles = StyleSheet.create({
    page: {
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 30,
        fontSize: 12,
        fontFamily: 'Helvetica',
        lineHeight: 1.2,
    },
    // === KOP SURAT ===
    kopContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        minHeight: 80,
    },
    kopLogo: {
        width: 68,
        height: 75,
        marginRight: 6,
        alignSelf: 'flex-start',
    },
    kopTextContainer: {
        flex: 1,
        marginBottom: 6,
        textAlign: 'center',
        alignItems: 'center',
    },
    kopTitle1: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        letterSpacing: 0.5,
    },
    kopTitle2: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        letterSpacing: 0.5,
    },
    kopAlamat: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 2,
        lineHeight: 1.2,
    },
    kopKontak: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 2,
        lineHeight: 1.2,
    },
    kopLineContainer: {
        marginTop: 0,
        marginBottom: 15,
    },
    kopLineTop: {
        borderBottomWidth: 0,
        borderBottomColor: '#000',
        marginBottom: 0,
    },
    kopLineBottom: {
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        marginBottom: 3,
    },

    // === HEADER SECTION ===
    headerContainer: {
        marginBottom: 8,
    },

    // Tanggal di kanan atas
    tanggalContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 15,
    },
    tanggalText: {
        fontSize: 12,
    },

    // Container untuk metadata saja
    metadataContainer: {
        marginBottom: 15,
    },

    // Bagian metadata (nomor, sifat, lampiran, hal)
    metaSection: {
        width: '60%',
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 3,
        alignItems: 'flex-start',
    },
    metaLabel: {
        width: 70,
        fontSize: 11,
    },
    metaColon: {
        width: 8,
        fontSize: 11,
    },
    metaValue: {
        flex: 1,
        fontSize: 11,
        lineHeight: 1.3,
    },

    // Bagian tujuan 
    recipientSection: {
        width: '60%',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    kepadaYth: {
        fontSize: 11,
        marginBottom: 3,
    },
    kepadaNama: {
        fontSize: 11,
        marginBottom: 1,
        lineHeight: 1.3,
    },
    kepadaAlamat: {
        fontSize: 11,
        marginBottom: 1,
        lineHeight: 1.3,
    },
    kepadaDi: {
        fontSize: 11,
        marginBottom: 1,
    },

    // === BODY SECTION ===
    bodyContainer: {
        marginTop: 6, 
        marginBottom: 5,
    },
    paragraph: {
        marginBottom: 5,
        textAlign: 'justify',
        lineHeight: 1.5,
        textIndent: 25,
        fontSize: 11,
    },
    paragraphNoIndent: {
        marginBottom: 5,
        textAlign: 'justify',
        lineHeight: 1.5,
        fontSize: 11,
    },

    // === SIGNATURE SECTION ===
    signatureContainer: {
        marginTop: 5,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
    },
    signatureBlock: {
        width: '50%',
        alignItems: 'center',
    },
    signatureJabatan: {
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 3,
        lineHeight: 1.3,
    },
    signatureSpacer: {
        height: 10,
        marginBottom: 3,
    },
    signatureName: {
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        textDecoration: 'underline',
        marginBottom: 1,
    },
    signaturePangkat: {
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 1,
        lineHeight: 1.2,
    },
    signatureNip: {
        fontSize: 11,
        textAlign: 'center',
    },

    // QR Code
    qrContainer: {
        alignItems: 'center',
        marginVertical: 5,
    },
    qrImage: {
        width: 80,
        height: 80,
    },
});

interface AlihMediaPDFProps {
    data: ExtendedSuratAlihMediaData;
}

export const AlihMediaPDF: React.FC<AlihMediaPDFProps> = ({ data }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>
                {/* === KOP SURAT === */}
                <View style={styles.kopContainer}>
                    {data.logoUrl && (
                        <Image style={styles.kopLogo} src={data.logoUrl} />
                    )}
                    <View style={styles.kopTextContainer}>
                        {data.instansi1 && (
                            <Text style={styles.kopTitle1}>{data.instansi1.toUpperCase()}</Text>
                        )}
                        {data.instansi2 && (
                            <Text style={styles.kopTitle2}>{data.instansi2.toUpperCase()}</Text>
                        )}
                        {data.alamat && (
                            <Text style={styles.kopAlamat}>{data.alamat}</Text>
                        )}
                        {data.kontak && (
                            <Text style={styles.kopKontak}>{data.kontak}</Text>
                        )}
                        {data.emailWeb && (
                            <Text style={styles.kopKontak}>{data.emailWeb}</Text>
                        )}
                    </View>
                </View>

                {/* Garis kop - sesuai gambar */}
                <View style={styles.kopLineContainer}>
                    <View style={styles.kopLineTop} />
                    <View style={styles.kopLineBottom} />
                </View>

                {/* === HEADER SECTION === */}
                <View style={styles.headerContainer}>
                    {/* Tanggal di kanan */}
                    <View style={styles.tanggalContainer}>
                        {data.tanggal && (
                            <Text style={styles.tanggalText}>{data.tanggal}</Text>
                        )}
                    </View>

                    {/* Metadata */}
                    <View style={styles.metadataContainer}>
                        <View style={styles.metaSection}>
                            {data.nomor && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Nomor</Text>
                                    <Text style={styles.metaColon}>:</Text>
                                    <Text style={styles.metaValue}>{data.nomor}</Text>
                                </View>
                            )}
                            {data.sifat && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Sifat</Text>
                                    <Text style={styles.metaColon}>:</Text>
                                    <Text style={styles.metaValue}>{data.sifat}</Text>
                                </View>
                            )}
                            {data.lampiran && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Lampiran</Text>
                                    <Text style={styles.metaColon}>:</Text>
                                    <Text style={styles.metaValue}>{data.lampiran}</Text>
                                </View>
                            )}
                            {data.hal && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Hal</Text>
                                    <Text style={styles.metaColon}>:</Text>
                                    <Text style={styles.metaValue}>{data.hal}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Tujuan - di kiri bawah setelah Hal */}
                    <View style={styles.recipientSection}>
                        <Text style={styles.kepadaYth}>Kepada Yth.</Text>
                        {data.kepada && (
                            <Text style={styles.kepadaNama}>{data.kepada}</Text>
                        )}
                        {data.di && (
                            <View>
                                <Text style={styles.kepadaDi}>di</Text>
                                <Text style={[styles.kepadaDi, { paddingLeft: 15 }]}>
                                    {data.di}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* === BODY SECTION === */}
                <View style={styles.bodyContainer}>
                    {/* Isi Surat */}
                    {data.isi && data.isi.length > 0 && data.isi.map((paragraph: string, index: number) => {
                        if (paragraph.trim()) {
                            return (
                                <Text key={index} style={styles.paragraph}>
                                    {paragraph}
                                </Text>
                            );
                        }
                        return null;
                    })}

                    {/* Penutup */}
                    {data.penutup && (
                        <Text style={styles.paragraph}>{data.penutup}</Text>
                    )}
                </View>

                {/* === SIGNATURE SECTION === */}
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureBlock}>
                        {data.ttdJabatan && (
                            <Text style={styles.signatureJabatan}>{data.ttdJabatan}</Text>
                        )}

                        {/* QR Code jika ada */}
                        {data.qrUrl && (
                            <View style={styles.qrContainer}>
                                <Image style={styles.qrImage} src={data.qrUrl} />
                            </View>
                        )}

                        {/* Ruang tanda tangan */}
                        <View style={styles.signatureSpacer} />

                        {data.ttdNama && (
                            <Text style={styles.signatureName}>{data.ttdNama}</Text>
                        )}
                        {data.ttdPangkat && (
                            <Text style={styles.signaturePangkat}>{data.ttdPangkat}</Text>
                        )}
                        {data.ttdNip && (
                            <Text style={styles.signatureNip}>NIP. {data.ttdNip}</Text>
                        )}
                    </View>
                </View>
            </Page>
        </Document>
    );
};