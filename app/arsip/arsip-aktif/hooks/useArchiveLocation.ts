import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { BIDANG_CABINET_MAP, LACI_CAPACITY } from "@/app/arsip/arsip-aktif/constants";

interface LocationParams {
  userNamaBidang: string | null;
  kodeKlasifikasi: string; // Still needed to determine initial drawer if LACI_CAPACITY is based on classification
  userIdBidang: number | null;
  nomorBerkasInput?: number | null; // Add file number from form input
  editId?: string | null;
}

// Define a specific type for the expected result of the select query with join and single()
interface BerkasLocationData {
  lokasi_penyimpanan: {
    no_laci: string;
    no_folder: string;
  } | null; // lokasi_penyimpanan might be null if the join doesn't find a match
}
export function useArchiveLocation({ userNamaBidang, kodeKlasifikasi, userIdBidang, nomorBerkasInput, editId }: LocationParams) {
  const supabase = createClient();
  const [location, setLocation] = useState({
    no_filing_cabinet: "",
    no_laci: "",
    no_folder: "",
  });

  useEffect(() => {
    const calculate = async () => {
      // kodeKlasifikasi might not be crucial for new folder_no, but could be for drawer
      if (!userNamaBidang || !userIdBidang) {
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

      // Calculate total number of files (arsip_aktif) in the user's field
      // to determine the drawer.
      let query = supabase
        .from("arsip_aktif")
        .select("id_arsip_aktif, lokasi_penyimpanan!inner(id_bidang_fkey)", { count: "exact" })
        .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang);
        // The .is("file_url", null) filter was removed because 'file_url' is no longer in the 'arsip_aktif' table.

      if (idsToExclude.length > 0) {
        query = query.not("id_arsip_aktif", "in", `(${idsToExclude.join(",")})`);
      }
      // If in edit mode, do not count the edited item in the total count calculation
      if (editId) {
        query = query.not("id_arsip_aktif", "eq", editId);
      }

      const { count: totalBerkasDiBidang } = await query;
      const jumlahBerkasSaatIniDiBidang = totalBerkasDiBidang || 0;

      // Calculate drawer
      // If editId exists, we need to retrieve the drawer number from the edited item, not recalculate.
      // For new entries, we calculate based on jumlahBerkasSaatIniDiBidang.
      let noLaci: string;
      let noFolder: string;

      if (editId) {
        const { data: currentArsip } = await supabase
          .from("arsip_aktif")
          .select("lokasi_penyimpanan!inner(no_laci, no_folder)")
          .eq("id_arsip_aktif", editId)
          .single<BerkasLocationData>(); // Explicitly type the result
        noLaci = currentArsip?.lokasi_penyimpanan?.no_laci || "1";
        noFolder = currentArsip?.lokasi_penyimpanan?.no_folder || "1";
      } else {
        // For new entries
        noLaci = (Math.floor(jumlahBerkasSaatIniDiBidang / LACI_CAPACITY) + 1).toString();

        // Set no_folder equal to the input nomor_berkas for new entries
        if (nomorBerkasInput && nomorBerkasInput > 0) {
          noFolder = nomorBerkasInput.toString();
        } else {
          // Fallback if nomorBerkasInput is invalid, use previous logic (number of files in drawer + 1)
          let berkasInLaciQuery = supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, lokasi_penyimpanan!inner()", { count: "exact" }) // Added join
            .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang)
            .eq("lokasi_penyimpanan.no_laci", noLaci);

          if (idsToExclude.length > 0) {
            berkasInLaciQuery = berkasInLaciQuery.not("id_arsip_aktif", "in", `(${idsToExclude.join(",")})`);
          }
          const { count: jumlahBerkasDiLaci } = await berkasInLaciQuery;
          noFolder = ((jumlahBerkasDiLaci || 0) + 1).toString();
        }
      }

      // Ensure no_laci does not exceed 4 (max drawer limit)
      if (parseInt(noLaci) > 4) noLaci = "4";

      setLocation({
        no_filing_cabinet: cabinetPrefix,
        no_laci: noLaci,
        no_folder: noFolder,
      });
    };
    calculate();
    // eslint-disable-next-line
  }, [userNamaBidang, kodeKlasifikasi, userIdBidang, nomorBerkasInput, editId, supabase]); // Add supabase to dependency array if not already there

  return location;
}
