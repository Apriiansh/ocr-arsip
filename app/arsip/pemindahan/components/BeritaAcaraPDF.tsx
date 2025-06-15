import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { formatDate } from '../utils';
import { ArsipAktif, PemindahanInfo } from '../types';
import { CombinedArsipData } from '../detail/[id]/page';

// Define types
interface UserInfo {
    nama: string;
    nip: string;
    jabatan: string;
    bidang: string;
    pangkat?: string; // Tambahkan tanda tanya untuk opsional
}

interface BeritaAcara {
    nomor_berita_acara: string;
    tanggal_berita_acara: string;
    keterangan: string;
    dasar: string;
}

interface BeritaAcaraPDFProps {
    beritaAcara: BeritaAcara;
    pemindahanInfo: PemindahanInfo;
    selectedArsip: CombinedArsipData[];
    userInfo: UserInfo;
    kepalaBidangInfo: UserInfo;
    sekretarisInfo: UserInfo;
}

// Register font (optional, if you want to use custom fonts)
Font.register({
  family: 'Arial',
  src: '/fonts/arial.ttf',
});

// Create styles
const styles = StyleSheet.create({
    page: {
        paddingTop: 20,
        paddingBottom: 30, // Increased bottom padding for footer
        paddingHorizontal: 30,
        fontFamily: 'Helvetica',
        fontSize: 12,
    },
    header: {
        flexDirection: 'row', // Allow logo and text to be side-by-side
        alignItems: 'center', // Vertically align items in the header
        marginBottom: 6, // Adjusted margin
    },
    headerLogo: { // Style for the logo
        width: 68, // Adjust as needed
        marginRight: 6, // Space between logo and text
    },
    headerTextContainer: { 
        flex: 1, 
        marginBottom: 6,
        textAlign: 'center',
    },
    headerImage: {
        width: 65,
        height: 65,
        marginBottom: 6,
        alignSelf: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    headerInfo: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 2,
    },
    headerInfoSmol: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 2,
    },
    headerLine: {
        borderBottom: '3px solid black',
        marginBottom: '3px',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        marginTop: 15,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 6,
    },
    documentNumber: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 15,
    },
    text: {
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'justify',
        lineHeight: 1.5,
    },
    paragraph: {
        marginBottom: 12,
        textAlign: 'justify',
        lineHeight: 1,
    },
    userInfo: {
        marginLeft: 20,
        marginBottom: 5,
    },
    userInfoRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    userInfoLabel: {
        width: 100,
    },
    userInfoValue: {
        flex: 1,
    },
    tableContainer: {
        marginTop: 15,
        marginBottom: 15,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
    },
    tableCol: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableCell: {
        margin: 5,
        fontSize: 10,
    },
    tableCellHeader: { // New style for header cells
        margin: 5,
        fontSize: 10,
        textAlign: 'center', // Center align header text
    },
    signatureSection: {
        marginTop: 20,
        flexDirection: 'row',
    },
    signatureCol: {
        flex: 1,
        alignItems: 'center',
    },
    signatureName: {
        marginTop: 12,
        fontWeight: 'bold',
    },
    signatureImage: { // Style untuk gambar tanda tangan
        width: 50, // Sesuaikan ukuran sesuai kebutuhan
        height: 50,  // Sesuaikan ukuran sesuai kebutuhan
    },
    signatureNIP: {
        fontSize: 11,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        color: 'grey',
    },
    downloadTimestamp: { // Style for download timestamp
        position: 'absolute',
        bottom: 30, // Same as footer
        left: 30,   // Left padding of the page
        fontSize: 8,
        color: 'grey',
        fontFamily: 'Helvetica', // Ensure consistent font
    }
});

export const BeritaAcaraPDF = ({
    beritaAcara,
    pemindahanInfo,
    selectedArsip,
    userInfo,
    kepalaBidangInfo,
    sekretarisInfo,
}: BeritaAcaraPDFProps) => {
    // Parse date
    const tanggalBA = new Date(beritaAcara.tanggal_berita_acara);
    const formattedDate = tanggalBA.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    // Get day, month, year separately
    const day = tanggalBA.getDate();
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = monthNames[tanggalBA.getMonth()];
    const year = tanggalBA.getFullYear();

    // Sort selectedArsip by nomor_berkas numerically
    const sortedArsip = [...selectedArsip].sort((a, b) => { // Diurutkan berdasarkan jenis arsip (label), lalu nomor berkas
        const labelA = (a.jenis_arsip || "").toLowerCase();
        const labelB = (b.jenis_arsip || "").toLowerCase();
        const numA = parseInt(a.nomor_berkas, 10);
        const numB = parseInt(b.nomor_berkas, 10);

        if (labelA < labelB) return -1;
        if (labelA > labelB) return 1;
        // Jika label sama, urutkan berdasarkan nomor berkas
        return numA - numB;
    });

    // Get current time for download timestamp
    const downloadTime = new Date();
    const formattedDateForTimestamp = downloadTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTimeForTimestamp = downloadTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const downloadTimestampText = `Waktu Unduh: ${formattedDateForTimestamp}, ${formattedTimeForTimestamp} WIB`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header} fixed>
                    <Image style={styles.headerLogo} src="/logosumsel.png" /> 
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>PEMERINTAH PROVINSI SUMATERA SELATAN</Text>
                        <Text style={styles.headerTitle}>DINAS KEARSIPAN</Text>
                        <Text style={styles.headerInfo}>Jalan Demang Lebar Daun Nomor 4863 Palembang</Text>
                        <Text style={styles.headerInfo}>Telepon: (0711) 364843 Faximile: (0711) 364843 Kode Pos 30137</Text>
                        <Text style={styles.headerInfoSmol}>e-mail: dinaskearsipan.provsumatera@gmail.com, Website: www.dinaskearsipan.wordpress.com</Text>
                    </View>
                    
                </View>

                <View style={styles.headerLine} />

                {/* Title */}
                <Text style={styles.title}>BERITA ACARA</Text>
                <Text style={styles.subtitle}>PEMINDAHAN ARSIP INAKTIF</Text>
                <Text style={styles.documentNumber}>Nomor: {beritaAcara.nomor_berita_acara}</Text>

                {/* Content */}
                <Text style={styles.paragraph}>
                    Pada tanggal {day} {month} {year} dilaksanakan pemindahan arsip aktif ke arsip inaktif dari bidang {kepalaBidangInfo.bidang} sebagai Unit Pengolah (UP) ke Record Centre. Yang bertanda tangan di bawah ini:
                </Text>

                {/* First Party Info */}
                <Text style={[styles.paragraph, { fontWeight: 'bold', marginTop: 2, marginBottom: 2 }]}>PIHAK PERTAMA (Yang Menyerahkan):</Text>
                <View style={[styles.userInfo, { marginBottom: 2 }]}>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Nama</Text>
                        <Text>: {kepalaBidangInfo.nama}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>NIP</Text>
                        <Text>: {kepalaBidangInfo.nip}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Pangkat/Gol</Text>
                        <Text>: {kepalaBidangInfo.pangkat}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Jabatan</Text>
                        <Text>: Kepala Bidang</Text>
                    </View>
                   
                </View>

                <Text style={[styles.paragraph, { fontWeight: 'bold', marginTop: 2, marginBottom: 2 }]}>PIHAK KEDUA (Yang Menerima):</Text>
                <View style={styles.userInfo}>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Nama</Text>
                        <Text>: {sekretarisInfo.nama}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>NIP</Text>
                        <Text>: {sekretarisInfo.nip}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Pangkat/Gol</Text>
                        <Text>: {sekretarisInfo.pangkat}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Text style={styles.userInfoLabel}>Jabatan</Text>
                        <Text>: Sekretaris</Text>
                    </View>
                </View>

                <Text style={styles.paragraph}>
                    Dengan ini PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA dan PIHAK KEDUA menerima berupa 2 (dua) berkas arsip inaktif sebagaimana terlampir.
                </Text>

                <Text style={styles.paragraph}>
                    Demikian Berita Acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                </Text>

                {/* Signature Section */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureCol}>
                        <Text>PIHAK PERTAMA</Text>
                        <Text style={{ minHeight: 20, marginBottom: 5 }}>{kepalaBidangInfo.pangkat}</Text>
                        <Image style={styles.signatureImage} src="/signature.png" />
                        <Text style={styles.signatureName}>{kepalaBidangInfo.nama}</Text>
                        <Text style={styles.signatureNIP}>NIP. {kepalaBidangInfo.nip}</Text>
                    </View>
                    <View style={styles.signatureCol}>
                        <Text>PIHAK KEDUA</Text>
                        <Text style={{ minHeight: 20, marginBottom: 5 }}>{sekretarisInfo.pangkat}</Text>
                        <Image style={styles.signatureImage} src="/signature.png" />
                        <Text style={styles.signatureName}>{sekretarisInfo.nama}</Text>
                        <Text style={styles.signatureNIP}>NIP. {sekretarisInfo.nip}</Text>
                    </View>
                </View>

                {/* Append the second page with the table of archives */}
            </Page>

            {/* Second page with table of archives */}
            <Page size="A4" style={styles.page}>
                 {/* Header on second page - if you want the header to repeat */}
                 <View style={styles.header} fixed>
                    <Image style={styles.headerLogo} src="/logo-sumsel.png" />
                    <View style={styles.headerTextContainer} /> {/* Empty container to push line down if needed or add text */}
                    <View style={styles.headerLine} />
                </View>
                <Text style={styles.title}>DAFTAR ARSIP YANG DIPINDAHKAN</Text>
                <Text style={styles.documentNumber}>Lampiran Berita Acara Nomor: {beritaAcara.nomor_berita_acara}</Text>

                {/* Table of archives */}
                <View style={styles.tableContainer}>
                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={styles.tableRowHeader}>
                            <View style={[styles.tableCol, { width: '10%' }]}>
                                <Text style={styles.tableCellHeader}>Nomor Berkas</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '15%' }]}>
                                <Text style={styles.tableCellHeader}>Kode Klasifikasi</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '15%' }]}>
                                <Text style={styles.tableCellHeader}>Jenis</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '12%' }]}>
                                <Text style={styles.tableCellHeader}>Tk. Perk.</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '10%' }]}>
                                <Text style={styles.tableCellHeader}>No. Boks</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '20%' }]}>
                                <Text style={styles.tableCellHeader}>Uraian Informasi</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '8%', textAlign: 'center' }]}>
                                <Text style={styles.tableCellHeader}>Jumlah</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '20%' }]}> {/* Adjusted width */}
                                <Text style={styles.tableCellHeader}>Jangka Simpan (Aktif/Inaktif)</Text>
                            </View>
                        </View>

                        {/* Table Body */}
                        {sortedArsip.map((arsip, index) => ( // Use sortedArsip
                            <View style={styles.tableRow} key={arsip.id_arsip_aktif}>
                                <View style={[styles.tableCol, { width: '10%', textAlign: 'center' }]}>
                                    <Text style={styles.tableCell}>{arsip.nomor_berkas}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%' }]}>
                                    <Text style={styles.tableCell}>{arsip.kode_klasifikasi}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%' }]}>
                                    <Text style={styles.tableCell}>{arsip.jenis_arsip || '-'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '12%', textAlign: 'center' }]}>
                                    <Text style={styles.tableCell}>{arsip.tingkat_perkembangan || '-'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '10%', textAlign: 'center' }]}>
                                    <Text style={styles.tableCell}>{arsip.nomor_boks_spesifik || '-'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '20%' }]}>
                                    <Text style={styles.tableCell}>{arsip.uraian_informasi}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '8%', textAlign: 'center' }]}>
                                    <Text style={[styles.tableCell, { textAlign: 'center' }]}>{arsip.jumlah}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '20%' }]}> {/* Adjusted width */}
                                    <Text style={styles.tableCell}>Aktif ({arsip.jangka_simpan_aktif_periode || '-'})</Text>
                                    <Text style={styles.tableCell}>Inaktif ({arsip.jangka_simpan_inaktif_periode || '-'})</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Additional Information */}
                <View style={styles.tableContainer}>
                    <Text style={[styles.paragraph, { fontSize: 11, marginTop: 10 }]}>
                        INFORMASI TAMBAHAN:
                    </Text>
                    <View style={styles.userInfo}>
                        <View style={styles.userInfoRow}>
                            <Text style={styles.userInfoLabel}>Lokasi Simpan</Text>
                            <Text>: {pemindahanInfo.lokasi_simpan}</Text>
                        </View>
                        <View style={styles.userInfoRow}> {/* Kategori Arsip dipindah ke bawah agar konsisten */}
                            <Text style={styles.userInfoLabel}>Kategori Arsip</Text>
                            <Text>: {pemindahanInfo.kategori_arsip}</Text>
                        </View>
                    </View>
                </View>

                {/* Signature Section for the attachment page */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureCol}>
                        <Text> </Text> {/* Baris kosong untuk penyesuaian alignment */}
                        <Text>PIHAK PERTAMA,</Text>
                        <Text style={{ minHeight: 20, marginBottom: 5 }}>{kepalaBidangInfo.pangkat}</Text>
                        <Image style={styles.signatureImage} src="/signature.png" />
                        <Text style={styles.signatureName}>{kepalaBidangInfo.nama}</Text>
                        <Text style={styles.signatureNIP}>NIP. {kepalaBidangInfo.nip}</Text>
                    </View>
                    <View style={styles.signatureCol}>
                        <Text>Palembang, {formattedDate}</Text>
                        <Text>PIHAK KEDUA,</Text>
                        <Text style={{ minHeight: 20, marginBottom: 5 }}>{sekretarisInfo.pangkat}</Text>
                        <Image style={styles.signatureImage} src="/signature.png" />
                        <Text style={styles.signatureName}>{sekretarisInfo.nama}</Text>
                        <Text style={styles.signatureNIP}>NIP. {sekretarisInfo.nip}</Text>
                    </View>
                </View>
                {/* Download Timestamp on the last page */}
                <Text style={styles.downloadTimestamp} fixed>
                    {downloadTimestampText}
                </Text>
            </Page>
        </Document>
    );
};