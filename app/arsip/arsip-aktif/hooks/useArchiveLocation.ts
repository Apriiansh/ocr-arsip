import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { BIDANG_CABINET_MAP, LACI_CAPACITY } from "@/app/arsip/arsip-aktif/constants";

interface LocationParams {
  userNamaBidang: string | null;
  kodeKlasifikasi: string;
  userIdBidang: number | null;
  editId?: string | null;
}

export function useArchiveLocation({ userNamaBidang, kodeKlasifikasi, userIdBidang, editId }: LocationParams) {
  const supabase = createClient();
  const [location, setLocation] = useState({
    no_filing_cabinet: "",
    no_laci: "",
    no_folder: "",
  });

  useEffect(() => {
    const calculate = async () => {
      if (!userNamaBidang || !userIdBidang || !kodeKlasifikasi) {
        setLocation({ no_filing_cabinet: "", no_laci: "", no_folder: "" });
        return;
      }
      const cabinetPrefix = BIDANG_CABINET_MAP[userNamaBidang];
      if (!cabinetPrefix) {
        setLocation({ no_filing_cabinet: "", no_laci: "", no_folder: "" });
        return;
      }

      // Exclude already-moved archives
      const { data: pemindahanLinks, error: pemindahanError } = await supabase
        .from("pemindahan_arsip_link")
        .select("id_arsip_aktif_fkey");
      const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

      // Ambil semua arsip aktif (belum dipindahkan) pada bidang & kode klasifikasi
      let query = supabase
        .from("arsip_aktif")
        .select("id_arsip_aktif, kode_klasifikasi, lokasi_penyimpanan!inner(id_bidang_fkey)")
        .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang)
        .ilike("kode_klasifikasi", `${kodeKlasifikasi}%`);

      if (idsToExclude.length > 0) {
        query = query.not("id_arsip_aktif", "in", `(${idsToExclude.join(",")})`);
      }

      const { data: arsipList } = await query;
      const jumlahArsip = arsipList ? arsipList.length : 0;

      // Hitung laci
      let noLaci = (Math.floor(jumlahArsip / LACI_CAPACITY) + 1).toString();
      if (parseInt(noLaci) > 4) noLaci = "4";
      let noFolder = "1";

      // Hitung folder dalam laci tsb (berdasarkan kode klasifikasi utama)
      let arsipInLaciQuery = supabase
        .from("arsip_aktif")
        .select("id_arsip_aktif, kode_klasifikasi, lokasi_penyimpanan!inner(no_laci, id_bidang_fkey)")
        .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang)
        .eq("lokasi_penyimpanan.no_laci", noLaci);

      if (idsToExclude.length > 0) {
        arsipInLaciQuery = arsipInLaciQuery.not("id_arsip_aktif", "in", `(${idsToExclude.join(",")})`);
      }

      const { data: arsipInLaciList } = await arsipInLaciQuery;
      const allKlasifikasiUtamaInLaci = new Set<string>();
      if (arsipInLaciList) {
        arsipInLaciList.forEach(arsip => {
          if (editId && `${arsip.id_arsip_aktif}` === `${editId}`) return;
          const utama = arsip.kode_klasifikasi.split("/")[0].trim();
          allKlasifikasiUtamaInLaci.add(utama);
        });
      }
      const inputUtama = kodeKlasifikasi.split("/")[0].trim();
      allKlasifikasiUtamaInLaci.add(inputUtama);

      console.log("allKlasifikasiUtamaInLaci", allKlasifikasiUtamaInLaci);

      if (allKlasifikasiUtamaInLaci.size > 0) {
        const sorted = Array.from(allKlasifikasiUtamaInLaci).sort();
        const idx = sorted.indexOf(inputUtama);
        console.log("sorted:", sorted, "idx input:", idx);
        if (idx !== -1) noFolder = (idx + 1).toString();
      }

      setLocation({
        no_filing_cabinet: cabinetPrefix,
        no_laci: noLaci,
        no_folder: noFolder,
      });
    };
    calculate();
    // eslint-disable-next-line
  }, [userNamaBidang, kodeKlasifikasi, userIdBidang, editId]);

  return location;
}