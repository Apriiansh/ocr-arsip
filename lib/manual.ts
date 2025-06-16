// lib/manual-data.ts
export interface ManualStep {
    title: string;
    content: string;
    image?: string;
  }
  
  export interface ManualContent {
    title: string;
    description: string;
    videoUrl?: string;
    videoThumbnail?: string;
    steps: ManualStep[];
    generalTips?: string[]; // Tips umum untuk fitur ini
    relatedLinks?: {
      title: string;
      slug: string;
    }[];
  }
  
  export const manualContent: Record<string, ManualContent> = {
    'login': {
      title: 'Cara Login ke Aplikasi',
      description: 'Panduan lengkap untuk masuk ke dalam aplikasi CrChive dengan aman.',
      videoUrl: '/videos/tutorial-login.mp4',
      videoThumbnail: '/images/thumbnails/login-thumb.jpg',
      steps: [
        {
          title: 'Buka Halaman Login',
          content: 'Akses halaman login melalui browser dengan mengunjungi URL aplikasi.',
          image: '/images/steps/login-step1.jpg'
        },
        {
          title: 'Masukkan Email',
          content: 'Ketikkan alamat email yang terdaftar di sistem.',
          image: '/images/steps/login-step2.jpg'
        },
        {
          title: 'Masukkan Password',
          content: 'Ketikkan password dengan hati-hati. Password akan ditampilkan dalam bentuk titik-titik untuk keamanan.',
          image: '/images/steps/login-step3.jpg'
        },
        {
          title: 'Klik Tombol Masuk',
          content: 'Setelah mengisi kedua field, klik tombol "Masuk" atau tekan Enter untuk melanjutkan proses autentikasi.',
          image: '/images/steps/login-step4.jpg'
        },
        {
          title: 'Akses Dashboard',
          content: 'Setelah berhasil login, sistem akan mengarahkan Anda ke dashboard utama sesuai dengan role/peran Anda.',
          image: '/images/steps/login-step5.jpg'
        }
      ],
      generalTips: [
        'Gunakan browser yang mendukung JavaScript dan pastikan cookies diaktifkan.',
        'Pastikan format email benar (contoh: nama@email.com). Jika lupa email, hubungi administrator sistem.',
        'Password minimal 8 karakter. Jangan bagikan password kepada siapapun dan ganti secara berkala.',
        'Periksa nama Anda di pojok kanan atas untuk memastikan login berhasil. Menu yang tampil disesuaikan dengan hak akses Anda.',
        'Pastikan koneksi internet Anda stabil.'
      ],
      relatedLinks: [
        { title: 'Mengganti Password', slug: 'mengganti-password' },
        { title: 'Daftar Akun', slug: 'daftar-akun' }
      ]
    },
  
    'daftar-akun': {
      title: 'Cara Mendaftar Akun Baru',
      description: 'Panduan untuk Admin membuat akun baru dalam sistem CrChive.',
      videoUrl: '/videos/tutorial-register.mp4',
      videoThumbnail: '/images/thumbnails/register-thumb.jpg',
      steps: [
        {
          title: 'Akses Halaman Kelola Data Pengguna',
          content: 'Login sebagai Admin dan Masuk ke menu Kelola Data Pengguna',
          image: '/images/steps/signup-step1.jpg'
        },
        {
          title: 'Klik Tombol Tambah Pengguna',
          content: 'Setelah masuk ke Halaman tersebut klik tombol "Tambah Pengguna"',
          image: '/images/steps/signup-step1.jpg'
        },
        {
          title: 'Isi Email dan Password',
          content: 'Masukkan alamat email aktif Anda dan buat password yang kuat.',
          image: '/images/steps/signup-step2.jpg'
        },
        {
          title: 'Isi Data Diri',
          content: 'Lengkapi form dengan data diri seperti Nama Lengkap, NIP, Pangkat/Golongan, Bidang, dan Jabatan.',
          image: '/images/steps/signup-step3.jpg'
        },
        {
          title: 'Klik Tombol Daftar',
          content: 'Setelah semua field terisi, klik tombol "Submit".',
          image: '/images/steps/signup-step4.jpg'
        },
      ],
      generalTips: [
        'Pastikan Anda memiliki email aktif untuk verifikasi dan siapkan data pribadi yang diperlukan (Nama, NIP, Pangkat, Bidang, Jabatan).',
        'Gunakan email yang valid dan aktif. Password minimal 8 karakter.',
        'Isi NIP dengan benar. Pilih Bidang dan Jabatan yang sesuai dari daftar dropdown. Pastikan semua field yang wajib diisi.',
        'Jangan mendaftar sebagai Kepala Bidang atau Sekretaris yang sudah memiliki akun (hanya ada 1 akun untuk role tersebut).'
      ],
      relatedLinks: [
        { title: 'Login', slug: 'login' },
        { title: 'Mengganti Password', slug: 'mengganti-password' }
      ]
    },
  
    'mengganti-password': {
      title: 'Mengganti Password',
      description: 'Langkah-langkah untuk mengubah kata sandi akun Anda.',
      steps: [
        {
          title: 'Login ke Aplikasi',
          content: 'Masuk ke aplikasi menggunakan email dan password Anda saat ini.',
          image: '/images/steps/login-step5.jpg',
        },
        {
          title: 'Akses Halaman Setting/Pengaturan',
          content: 'Setelah login, cari menu "Pengaturan" atau ikon profil Anda, biasanya terletak di pojok kanan atas atau di navbar navigasi.',
          image: '/images/steps/settings-access.jpg',
        },
        {
          title: 'Cari Bagian Ubah Password',
          content: 'Di halaman Pengaturan, temukan bagian atau form yang berjudul "Ubah Password".',
          image: '/images/steps/settings-changepw-section.jpg',
        },
        {
          title: 'Masukkan Password Baru',
          content: 'Ketikkan password baru Anda di field yang tersedia. Pastikan password baru memenuhi kriteria keamanan (minimal 8 karakter).',
          image: '/images/steps/settings-newpw.jpg',
        },
        {
          title: 'Konfirmasi Password Baru',
          content: 'Ketikkan kembali password baru Anda di field konfirmasi untuk memastikan tidak ada kesalahan pengetikan.',
          image: '/images/steps/settings-confirmpw.jpg',
        },
        {
          title: 'Simpan Perubahan',
          content: 'Klik tombol "Simpan Perubahan" atau "Update Password". Anda mungkin akan diminta memasukkan password lama Anda untuk verifikasi tambahan.',
          image: '/images/steps/settings-savepw.jpg'
        }
      ],
      generalTips: [
        'Gunakan password yang kuat dan unik.',
        'Jangan gunakan password yang sama dengan akun lain.',
        'Catat password baru Anda di tempat yang aman.',
        'Gunakan password yang berbeda dengan password lama.'
      ],
      relatedLinks: [
        { title: 'Login', slug: 'login' }, { title: 'Register', slug: 'daftar-akun' }, 
      ]
    },
  
    'menambahkan-arsip-aktif': {
      title: 'Menambahkan Arsip Aktif',
      description: 'Panduan untuk pegawai dalam menambahkan dokumen arsip aktif ke dalam sistem.',
      videoUrl: '/videos/tutorial-add-active-archive.mp4',
      videoThumbnail: '/images/thumbnails/add-active-thumb.jpg',
      steps: [
        {
          title: 'Akses Menu Arsip Aktif',
          content: 'Login ke sistem dan navigasi ke menu "Arsip" > "Arsip Aktif" di navbar aplikasi. Kemudian klik tombol "Tambah Arsip Aktif".',
          image: '/images/steps/arsipaktif-menu.jpg'
        },
        {
          title: 'Unggah Dokumen PDF (Opsional)',
          content: 'Jika ada file PDF terkait, unggah file tersebut. Anda dapat mengekstrak data dari PDF untuk mengisi beberapa field otomatis.',
          image: '/images/steps/arsipaktif-upload.jpg'
        },
        {
          title: 'Isi Detail Arsip',
          content: 'Lengkapi semua field yang diperlukan seperti Nomor Berkas, Kode Klasifikasi, Uraian Informasi, Kurun Waktu Penciptaan, Retensi Aktif, Keterangan, Tingkat Perkembangan, Media Simpan, dan Jumlah.',
          image: '/images/steps/arsipaktif-form.jpg'
        },
        {
          title: 'Periksa Lokasi Penyimpanan',
          content: 'Lokasi Penyimpanan (No. Filing Cabinet, No. Laci, No. Folder) akan dihitung otomatis berdasarkan Bidang Anda dan Kode Klasifikasi.',
          image: '/images/steps/arsipaktif-lokasi.jpg'
        },
        {
          title: 'Review dan Simpan',
          content: 'Periksa kembali semua informasi yang telah diisi, kemudian klik "Simpan" untuk menyimpan arsip.',
          image: '/images/steps/arsipaktif-simpan.jpg'
        }
      ],
      generalTips: [
        'pastikan untuk mengupload file pdf dengan hasil scan yang baik, guna keefektifan dalam memproses otomatisasi dengan teknologi OCR (scanner teks)',
        'Pastikan Anda login dengan akun yang memiliki hak akses Pegawai.',
        'Nomor Berkas akan terisi otomatis jika Anda bukan sedang mengedit.',
        'Kode Klasifikasi bisa dipilih dari daftar atau diinput manual.',
        'Saat menginput kode klasifikasi dengan format lama misal 045.4 maka akan diklasifikasikan dengan format kode baru misalnya 000.5.6',
        'Pastikan Kode Klasifikasi sudah benar untuk perhitungan lokasi yang akurat. Pastikan semua field yang wajib telah terisi.',
      ],
      relatedLinks: [
        { title: 'Melihat Daftar Arsip Aktif', slug: 'daftar-arsip-aktif' },
        { title: 'Proses Pemindahan Arsip', slug: 'pemindahan-arsip' }
      ]
    },

    'daftar-arsip-aktif': {
        title: 'Melihat Daftar Arsip Aktif',
        description: 'Panduan untuk melihat, mencari, dan mengelola daftar arsip aktif yang telah Anda atau bidang Anda tambahkan.',
        steps: [
            {
                title: 'Akses Menu Daftar Arsip Aktif',
                content: 'Dari navbar, navigasi ke "Arsip" > "Daftar Arsip Aktif". Halaman ini akan menampilkan semua arsip aktif yang terkait dengan bidang Anda.',
                image: '/images/steps/daftaraktif-menu.jpg',
            },
            {
                title: 'Pencarian dan Filter',
                content: 'Gunakan kotak pencarian untuk mencari arsip berdasarkan kode klasifikasi atau uraian informasi. Anda juga dapat memfilter berdasarkan status persetujuan.',
                image: '/images/steps/daftaraktif-filter.jpg',
            },
            {
                title: 'Aksi pada Arsip',
                content: 'Untuk setiap arsip, Anda dapat melihat detailnya atau menghapusnya (jika memiliki izin). Tombol "Tata Ulang" memungkinkan penomoran ulang berkas.',
                image: '/images/steps/daftaraktif-aksi.jpg'
            },
            {
                title: 'Export ke Excel',
                content: 'Anda dapat mengekspor daftar arsip aktif yang ditampilkan ke dalam format Excel.',
                image: '/images/steps/daftaraktif-export.jpg',
            },
            {
                title: 'Visualisasi Filing Cabinet',
                content: 'Tombol ini akan membawa Anda ke halaman visualisasi tata letak arsip di filing cabinet.',
                image: '/images/steps/daftaraktif-visual.jpg',
            }
        ],
        generalTips: [
            'Penghapusan arsip bersifat permanen.',
            'Tata ulang nomor berkas akan mengatur ulang nomor urut berdasarkan kriteria tertentu.'
        ],
        relatedLinks: [
            { title: 'Menambahkan Arsip Aktif', slug: 'menambahkan-arsip-aktif' },
            { title: 'Filing Cabinet', slug: 'visualisasi-filing-cabinet' }
        ]
    },

    'visualisasi-filing-cabinet': {
        title: 'Melihat Visualisasi Filing Cabinet',
        description: 'Panduan untuk menampilkan visualisasi filing cabinet yang ada pada bidang Anda.',
        videoUrl: '/videos/tutorial-visualisasi-cabinet.mp4',
        steps: [
            {
                title: 'Akses Menu Daftar Arsip Aktif',
                content: 'Dari navbar, navigasi ke "Arsip" > "Daftar Arsip Aktif". Halaman ini akan menampilkan semua arsip aktif yang terkait dengan bidang Anda.',
                image: '/images/steps/daftaraktif-menu.jpg',
            },
            {
                title: 'Button Visualisasi Filing Cabinet',
                content: 'Tombol ini akan membawa Anda ke halaman visualisasi tata letak arsip di filing cabinet.',
                image: '/images/steps/daftaraktif-visual.jpg',
            },
            {
                title: 'Halaman Visualisasi Filing Cabinet',
                content: 'Halaman ini akan menampilkan visualisasi filing cabinet yang dapat anda lihat laci, folder dan juga arsip-arsipnya',
                image: '/images/steps/daftaraktif-visual.jpg',
            }

        ],
        generalTips: [
            'Hanya menampilkan filing cabinet yang ada di bidang Anda.',
            'Gunakan untuk melihat dan memantau tata letak arsip yang ada di filing cabinet.'
        ],
        relatedLinks: [
            { title: 'Menambahkan Arsip Aktif', slug: 'menambahkan-arsip-aktif' },
            { title: 'Proses Pemindahan Arsip', slug: 'pemindahan-arsip' }
        ]
    },

    'monitoring-retensi-arsip': {
        title: 'Monitoring Retensi Arsip Aktif',
        description: 'Panduan untuk memantau masa retensi arsip aktif dan mengidentifikasi arsip yang mendekati atau telah melewati batas waktu retensinya.',
        steps: [
            {
                title: 'Akses Menu Monitoring Retensi',
                content: 'Login ke sistem dan navigasi ke menu "Arsip"  > "Retensi".',
                image: '/images/steps/monitoring-retensi-menu.jpg',  
            },
            {
                title: 'Lihat Daftar Arsip dan Status Retensi',
                content: 'Halaman akan menampilkan daftar arsip aktif beserta informasi tanggal retensi aktifnya. Perhatikan arsip yang ditandai sebagai "Segera Pindah" atau "Sudah Lewat Retensi".',
                image: '/images/steps/monitoring-retensi-list.jpg',  
            },
            {
                title: 'Filter dan Urutkan Data',
                content: 'Gunakan fitur filter untuk menampilkan arsip berdasarkan masa retensi yang telah lewat atau filter berdasarkan berapa lama waktu akan habis retens aktifnya.',
                image: '/images/steps/monitoring-retensi-filter.png',  
            },
            {
                title: 'Identifikasi Tindakan Lanjutan',
                content: 'Berdasarkan status retensi, Anda dapat mengidentifikasi arsip mana yang perlu segera diproses untuk pemindahan ke arsip inaktif.',
                image: '/images/steps/monitoring-retensi-aksi.jpg',  
            }
        ],
        generalTips: [
            'Periksa secara berkala halaman monitoring retensi untuk memastikan tidak ada arsip yang terlewat dari proses pemindahan.',
            'Sistem akan memberikan notifikasi untuk arsip yang mendekati masa akhir retensi aktif.',
        ],
        relatedLinks: [
            { title: 'Proses Pemindahan Arsip', slug: 'pemindahan-arsip' },
            { title: 'Melihat Daftar Arsip Aktif', slug: 'daftar-arsip-aktif' }
        ]
    },

    'pemindahan-arsip': {
        title: 'Proses Pemindahan Arsip Aktif ke Inaktif',
        description: 'Panduan langkah demi langkah untuk memindahkan arsip aktif yang sudah memenuhi masa retensi ke penyimpanan arsip inaktif.',
        videoUrl: '/videos/tutorial-pemindahan-arsip.mp4',
        steps: [
            {
                title: 'Akses Menu Pemindahan Arsip',
                content: 'Dari navbar, navigasi ke "Pemindahan Arsip".',
                image: '/images/steps/pemindahan-menu.jpg',
            },
            {
                title: 'Langkah 1: Pilih Arsip',
                content: 'Pilih arsip aktif yang akan dipindahkan. Anda dapat menggunakan filter "Kadaluarsa" untuk menampilkan arsip yang sudah melewati masa retensi aktifnya. Klik "Lanjutkan".',
                image: '/images/steps/pemindahan-step1.jpg'
            },
            {
                title: 'Langkah 2: Isi Berita Acara',
                content: 'Lengkapi detail Berita Acara Pemindahan, seperti Nomor BA dan Tanggal BA. Klik "Lanjutkan".',
                image: '/images/steps/pemindahan-step2.jpg',
            },
            {
                title: 'Langkah 3: Persetujuan',
                content: 'Proses pemindahan memerlukan persetujuan dari Kepala Bidang Anda dan Sekretaris. Status persetujuan akan ditampilkan di sini. Anda perlu menunggu hingga kedua pihak menyetujui. Klik "Lanjutkan" jika sudah disetujui.',
                image: '/images/steps/pemindahan-step3.jpg'
            },
            {
                title: 'Langkah 4: Informasi Pemindahan Inaktif',
                content: 'Isi detail penyimpanan arsip inaktif, seperti Lokasi Simpan, Nomor Boks, Kategori Arsip, Jenis Arsip, Masa Retensi Inaktif, dan Nasib Akhir. Klik "Proses Pemindahan".',
                image: '/images/steps/pemindahan-step4.jpg',
            },
            {
                title: 'Langkah 5: Konfirmasi Selesai',
                content: 'Setelah proses pemindahan selesai, Anda akan melihat konfirmasi. Anda dapat melihat daftar arsip inaktif, riwayat pemindahan, atau memulai pemindahan baru.',
                image: '/images/steps/pemindahan-step5.jpg',
            }
        ],
        generalTips: [
            'Notifikasi akan muncul jika terdeteksi ada arsip yang telah melewati masa retensi arsi aktifnya',
            'Pilih minimal satu arsip untuk dipindahkan.',
            'Jika proses persetujuan ditolak, Anda mungkin perlu merevisi atau reset proses.',
            'Jika kode klasifikasi sesuai dengan format yang ada, maka akan otomatis mengisi field JRA nya'
        ],
        relatedLinks: [
            { title: 'Melihat Daftar Arsip Aktif', slug: 'daftar-arsip-aktif' },
            { title: 'Melihat Daftar Arsip Inaktif', slug: 'daftar-arsip-inaktif' }
        ]
    },

    'kelola-pengguna': {
      title: 'Kelola Pengguna (Admin)',
      description: 'Panduan lengkap untuk administrator dalam mengelola akun pengguna, peran, dan hak akses sistem.',
      videoUrl: '/videos/tutorial-user-management.mp4',
      videoThumbnail: '/images/thumbnails/usermgmt-thumb.jpg',
      steps: [
        {
          title: 'Akses Panel Admin',
          content: 'Login sebagai administrator dan akses menu "Kelola Pengguna" dari navbar.',
          image: '/images/steps/admin-kelola-menu.jpg'
        },
        {
          title: 'Tambah Pengguna Baru',
          content: 'Klik tombol "Tambah Pengguna" dan isi form registrasi dengan data lengkap calon pengguna.'
        },
        {
            title: 'Edit Pengguna',
            content: 'Klik ikon pensil pada baris pengguna yang ingin diedit. Anda dapat mengubah Nama, Email, NIP, Pangkat, Jabatan, Role, dan Bidang. Password juga dapat direset di sini.',
            image: '/images/steps/admin-edit-user.jpg',
        },
        {
            title: 'Hapus Pengguna',
            content: 'Klik ikon tong sampah pada baris pengguna yang ingin dihapus. Akan ada konfirmasi sebelum penghapusan.',
            image: '/images/steps/admin-delete-user.jpg'
        },
        {
            title: 'Filter dan Sortir',
            content: 'Gunakan filter berdasarkan Role untuk menampilkan pengguna tertentu. Anda juga dapat mengurutkan daftar pengguna berdasarkan kolom Nama, Email, Jabatan, Role, atau Bidang.',
            image: '/images/steps/admin-filter-sort.jpg',
        }
      ],
      generalTips: [
        'Hanya akun dengan role Administrator yang dapat mengakses menu ini.',
        'Verifikasi data pengguna sebelum membuatkan akun. Tentukan Role dan Bidang yang sesuai. Password yang dibuat akan diinformasikan kepada pengguna untuk login pertama kali.',
        'Penghapusan pengguna bersifat permanen dan akan menghapus data terkait pengguna tersebut dari sistem autentikasi.'
      ],
      relatedLinks: [
        { title: 'Login', slug: 'login' },
      ]
    },
    'verifikasi-arsip-aktif': {
        title: 'Verifikasi Arsip Aktif (Kepala Bidang)',
        description: 'Panduan untuk Kepala Bidang dalam melakukan verifikasi arsip aktif yang telah ditambahkan oleh pegawai.',
        steps: [
            {
                title: 'Akses Menu Verifikasi Arsip Aktif',
                content: 'Login sebagai Kepala Bidang dan navigasi ke menu "Verifikasi Arsip Inaktif" di navbar.',
                image: '/images/steps/sekre-verif-inaktif-menu.jpg',
            },
            {
                title: 'Tinjau Daftar Arsip',
                content: 'Halaman akan menampilkan daftar arsip inaktif yang menunggu persetujuan Anda. Anda dapat menggunakan filter status (Menunggu, Disetujui, Ditolak) dan pencarian.',
                image: '/images/steps/sekre-verif-aktif-list.jpg',
            },
            {
                title: 'Pilih Arsip dan Lakukan Aksi',
                content: 'Pilih satu atau beberapa arsip dengan mencentang kotak di sebelah kiri. Kemudian, klik tombol "Setujui" atau "Tolak" yang muncul di bagian atas.',
                image: '/images/steps/sekre-verif-aktif-aksi.jpg'
            }
        ]
    },
    'verifikasi-arsip-inaktif': {
        title: 'Verifikasi Arsip Inaktif (Sekretaris)',
        description: 'Panduan untuk Sekretaris dalam melakukan verifikasi terhadap arsip yang telah dipindahkan ke status inaktif oleh pegawai.',
        steps: [
            {
                title: 'Akses Menu Verifikasi Arsip Inaktif',
                content: 'Login sebagai Sekretaris dan navigasi ke menu "Verifikasi Arsip Inaktif" di navbar.',
                image: '/images/steps/sekre-verif-inaktif-menu.jpg',
            },
            {
                title: 'Tinjau Daftar Arsip',
                content: 'Halaman akan menampilkan daftar arsip inaktif yang menunggu persetujuan Anda. Anda dapat menggunakan filter status (Menunggu, Disetujui, Ditolak) dan pencarian.',
                image: '/images/steps/sekre-verif-inaktif-list.jpg',
            },
            {
                title: 'Pilih Arsip dan Lakukan Aksi',
                content: 'Pilih satu atau beberapa arsip dengan mencentang kotak di sebelah kiri. Kemudian, klik tombol "Setujui" atau "Tolak" yang muncul di bagian atas.',
                image: '/images/steps/sekre-verif-inaktif-aksi.jpg'
            }
        ]
    },
    'verifikasi-pemindahan-arsip': {
        title: 'Verifikasi Pemindahan Arsip (Kepala Bidang & Sekretaris)',
        description: 'Panduan untuk Kepala Bidang dan Sekretaris dalam menyetujui atau menolak proses pemindahan arsip dari aktif ke inaktif.',
        videoUrl: '/videos/verifikasi-pemindahan.mp4',
        steps: [
            {
                title: 'Akses Menu Verifikasi Pemindahan',
                content: 'Login sesuai peran Anda (Kepala Bidang atau Sekretaris). Navigasi ke menu "Verifikasi Pemindahan Arsip" di navbar.',
                image: '/images/steps/verif-pemindahan-menu.jpg',
            },
            {
                title: 'Tinjau Permintaan',
                content: 'Daftar permintaan pemindahan akan muncul. Kepala Bidang akan melihat permintaan dari bidangnya, sedangkan Sekretaris akan melihat permintaan yang sudah disetujui Kepala Bidang.',
                image: '/images/steps/verif-pemindahan-list.jpg',
            },
            {
                title: 'Lihat Detail dan Beri Persetujuan',
                content: 'Klik tombol "Detail" untuk melihat rincian arsip yang diajukan. Setelah meninjau, klik tombol "Setuju" atau "Tolak".',
                image: '/images/steps/verif-pemindahan-aksi.jpg'
            }
        ],
        generalTips: [
            'Kepala Bidang adalah pihak pertama yang menyetujui.',
            'Sekretaris adalah pihak kedua yang menyetujui setelah Kepala Bidang.',
            'Verifikasi penting agar proses pemindahan dapat dilanjutkan.',
        ],
    },
    'laporan-arsip-aktif': {
        title: 'Laporan Arsip Aktif',
        description: 'Panduan untuk Kepala Dinas untuk melihat dan mengunduh laporan arsip aktif',
        // videoUrl: '/videos/laporan-aktif.mp4',
        steps: [
            {
                title: 'Akses Menu Laporan Arsip Aktif',
                content: 'Login sebagai dengan peran/role Kepala Dinas. Navigasi ke menu "Laporan Arsip Aktif" di navbar.',
                image: '',
            },
            {
                title: 'Tinjau Laporan',
                content: 'Lihat laporan arsip aktif yang ada pada setiap bidang.',
                image: '',
            },
            {
                title: 'Mengunduh File Laporan',
                content: 'Unduh file laporan dalam format excel yang di generate otomatis berdasarkan laporan yang ada',
                image: '',
            },
        ],
        generalTips: [
            'Laporan arsip aktif yang diunduh sudah dipisahkan menjadi beberapa sheet untuk ringkasan laporan kearsipan.',
            'Laporan arsip aktif yang diunduh merupakan arsip dalam periode 6 bulan',
        ],
        relatedLinks: [
            { title: 'Laporan Arsip inaktif', slug: 'laporan-arsip-inaktif' },
        ]
    },
    'laporan-arsip-inaktif': {
        title: 'Laporan Arsip Inaktif',
        description: 'Panduan untuk Kepala Dinas untuk melihat dan mengunduh laporan arsip inaktif',
        // videoUrl: '/videos/laporan-aktif.mp4',
        steps: [
            {
                title: 'Akses Menu Laporan Arsip Inaktif',
                content: 'Login sebagai dengan peran/role Kepala Dinas. Navigasi ke menu "Laporan Arsip Aktif" di navbar.',
                image: '',
            },
            {
                title: 'Tinjau Laporan',
                content: 'Lihat laporan arsip inaktif yang ada pada instansi.',
                image: '',
            },
            {
                title: 'Mengunduh File Laporan',
                content: 'Unduh file laporan dalam format excel yang di generate otomatis berdasarkan laporan yang ada',
                image: '',
            },
        ],
        generalTips: [
            'Laporan arsip inaktif yang diunduh sudah dipisahkan menjadi beberapa sheet untuk ringkasan laporan kearsipan.',
        ],
        relatedLinks: [
            { title: 'Laporan Arsip Aktif', slug: 'laporan-arsip-aktif' },
        ]
    }
  };
  
  // Utility function untuk mendapatkan manual content
  export function getManualContent(slug: string): ManualContent | null {
    return manualContent[slug] || null;
  }
  
  // Utility function untuk mendapatkan semua slugs
  export function getAllManualSlugs(): string[] {
    return Object.keys(manualContent);
  }