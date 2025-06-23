"use client";

import { useDaftarArsipAktif } from "../daftar-aktif/useDaftarArsipAktif";
import { DaftarArsipAktifUI } from "./components/DaftarArsipAktifUI";

export type { ArsipRow, IsiBerkasRow } from '../daftar-aktif/useDaftarArsipAktif';

export default function DaftarArsipAktifPage() {
  const props = useDaftarArsipAktif();
  return <DaftarArsipAktifUI {...props} />;
}
