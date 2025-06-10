import { SupabaseClient } from "@supabase/supabase-js";

export interface KlasifikasiArsipInfo {
    kode_klasifikasi: string;
    aktif: number | string | null;
    inaktif: number | string | null;
    nasib_akhir: string | null;
  }
  
  export async function findKlasifikasiData(
    supabaseClient: SupabaseClient, 
    kodeInput: string
  ): Promise<KlasifikasiArsipInfo | null> {
    const kodeDasarInput = kodeInput.split("/")[0].trim();
    if (!kodeDasarInput) return null;
  
    // Try new code
    const { data, error } = await supabaseClient
      .from("klasifikasi_arsip")
      
      .select("kode_klasifikasi, aktif, inaktif, nasib_akhir")
      .eq("kode_klasifikasi", kodeDasarInput)
      .single();
  
    // Melakukan cast tipe data secara eksplisit
    if (!error && data) return data as KlasifikasiArsipInfo;
  
    // Try old code
    // Menggunakan nama variabel yang berbeda untuk hasil query kedua
    const { data: oldData, error: oldError } = await supabaseClient
      .from("klasifikasi_arsip")
      .select("kode_klasifikasi, aktif, inaktif, nasib_akhir")
      .eq("kode_klasifikasi_old", kodeDasarInput)
      .single();
  
    // Melakukan cast tipe data secara eksplisit
    if (!oldError && oldData) return oldData as KlasifikasiArsipInfo;

    return null;
  }