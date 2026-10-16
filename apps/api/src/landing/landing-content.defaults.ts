import { LandingContentData } from './landing-content.types';

// The copy the landing page shipped with. It is written to the database the first time the content
// is read, after which the admin owns it.
export const DEFAULT_LANDING_CONTENT: LandingContentData = {
  seo: {
    title: 'Jasa Foto Wisuda Semarang | Spesialis Kebaya & Squad',
    description:
      'Spesialis fotografi wisuda di Semarang. Mengabadikan momen kelulusan, kebaya, toga, personal solo, squad sahabat, dan keluarga (Undip, Unnes, Udinus, Polines, Unika, UIN) dalam estetika 35mm yang berkarakter.',
    keywords: [
      'jasa foto wisuda semarang',
      'fotografer wisuda semarang',
      'foto wisuda undip',
      'foto wisuda unnes',
      'foto wisuda udinus',
      'foto wisuda polines',
      'foto wisuda unika',
      'foto wisuda uin walisongo',
      'foto kebaya wisuda',
      'foto toga wisuda',
      'paket photoshoot wisuda semarang',
      'studio foto wisuda semarang',
    ],
  },
  hero: {
    badge: 'Semarang, Jawa Tengah • Wisuda 2026',
    headlineLine1: 'Hari ini berlalu cepat,',
    headlineLine2: 'sebuah frame',
    headlineLine3: 'membuatnya abadi.',
    subtitle:
      'Spesialis fotografi wisuda di Semarang. Mengabadikan momen kelulusan, kebaya, dan kebersamaan sahabat dalam estetika warna yang abadi.',
    primaryCta: 'Reservasi Sekarang',
    secondaryCta: 'Lihat Galeri Foto',
  },
  portfolio: {
    heading: 'Katalog Foto Wisuda',
    description:
      'Setiap foto diproses dengan color grading berkarakter untuk mempertahankan detail natural dan keanggunan kebaya wisuda.',
  },
  about: {
    heading: 'Bukan sekadar foto toga kaku.',
    subheading: 'Kami menangkap rasa bangga, haru, dan tawa yang sesungguhnya.',
    body: 'Kami berdiri di Semarang dari keyakinan sederhana: wisuda adalah puncak dari tahun-tahun perjuanganmu. Hari istimewa ini layak diabadikan dengan pengarahan gaya yang santai dan penuh makna.',
    points: [
      {
        title: 'Kamu Tidak Perlu Berbakat Pose',
        description:
          'Fotografer kami memandu dari gestur tangan, arah pandangan, hingga interaksi santai agar hasil foto terlihat lepas.',
      },
      {
        title: 'Satu Hari, Slot Terkunci Khusus',
        description:
          'Kami tidak menduplikasi jadwal pemotretan di jam yang sama. Waktu tim sepenuhnya didedikasikan untukmu.',
      },
      {
        title: 'Seluruh File Mentah Diserahkan Penuh',
        description:
          'Tidak ada biaya tersembunyi per-foto. Semua foto RAW dan JPG resolusi asli langsung menjadi arsip pribadimu.',
      },
    ],
  },
  packages: {
    heading: 'Pilihan Paket Foto',
    description: 'Semua paket sudah termasuk seluruh file mentah dan foto edited kualitas master.',
  },
  steps: [
    {
      title: 'Pilih Paket',
      description: 'Tentukan paket yang sesuai kebutuhanmu dari katalog paket di atas.',
    },
    {
      title: 'Kunci Jadwal',
      description:
        'Isi data dan pilih jadwal di form reservasi, lalu selesaikan pembayaran untuk mengamankan slot fotografer.',
    },
    {
      title: 'Sesi Hari-H',
      description: 'Tim fotografer hadir di kampus pilihanmu dan mengarahkan pose secara santai.',
    },
    {
      title: 'Terima Arsip',
      description:
        'Akses seluruh file mentah di Drive dan terima hasil color grading dalam 7 hari kerja.',
    },
  ],
};
