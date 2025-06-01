import { Metadata } from "next";
import VerifikasiKepalaBidangClient from "./VerifikasiKepalaBidangClient";

export const metadata: Metadata = {
  title: "Verifikasi Pemindahan Arsip - Kepala Bidang",
  description: "Halaman verifikasi pemindahan arsip untuk Kepala Bidang",
};

export default function VerifikasiKepalaBidangPage() {
  return <VerifikasiKepalaBidangClient />;
}