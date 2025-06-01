import { Metadata } from "next";
import VerifikasiSekretarisClient from "./VerifikasiSekretarisClient";

export const metadata: Metadata = {
  title: "Verifikasi Pemindahan Arsip - Sekretaris",
  description: "Halaman verifikasi pemindahan arsip untuk Sekretaris",
};

export default function VerifikasiSekretarisPage() {
  return <VerifikasiSekretarisClient />;
}