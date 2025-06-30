import { createClient } from "@/utils/supabase/client";
import { debounce } from "lodash";
import { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export function useAlihMediaFormDraft<T extends object>(
  formData: T,
  arsipId: string | null, 
  setFormDataExternal?: (data: T) => void
) {
  const supabase = createClient();
  const setFormData = setFormDataExternal;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const DRAFT_TABLE_NAME = "draft_input_alih_media";

  // Ganti debounce ke interval 5 detik (5000 ms)
  const saveDraft = useCallback(
    debounce(async (currentData: T) => {
      if (!currentUserId || !arsipId) return;
      if (Object.keys(currentData).length === 0) return;

      // Cek apakah draft sudah ada
      const { data: existing, error: fetchError } = await supabase
        .from(DRAFT_TABLE_NAME)
        .select("draft_id")
        .eq("user_id", currentUserId)
        .eq("arsip_id", arsipId)
        .maybeSingle();

      if (fetchError) {
        console.error("Gagal cek draft isi arsip:", fetchError);
      }

      const { error } = await supabase
        .from(DRAFT_TABLE_NAME)
        .upsert(
          {
            user_id: currentUserId,
            arsip_id: arsipId,
            data: currentData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,arsip_id" }
        );
      if (error) {
        console.error("Gagal menyimpan draft isi arsip:", error);
        toast.error("Gagal menyimpan draft form isi arsip.");
      } else {
        if (existing) {
          console.info("Draft alih media diupdate untuk user_id:", currentUserId, "arsip_id:", arsipId);
        } else {
          console.info("Draft alih media baru disimpan untuk user_id:", currentUserId, "arsip_id:", arsipId);
        }
        toast.success("Draft berhasil disimpan!");
      }
    }, 3000),
    [currentUserId, arsipId, supabase]
  );

  const loadDraft = useCallback(async () => {
    if (!currentUserId || !arsipId || !setFormData) return;
    const { data, error } = await supabase
      .from(DRAFT_TABLE_NAME)
      .select("data")
      .eq("user_id", currentUserId)
      .eq("arsip_id", arsipId)
      .maybeSingle();
    if (error) { toast.error("Gagal memuat draft form isi arsip."); return; }
    if (data && data.data) { setFormData(data.data as T); toast.info("Draft isi arsip berhasil dimuat.");
      console.info("Draft alih media diload untuk user_id:", currentUserId, "arsip_id:", arsipId);
    }
  }, [currentUserId, arsipId, setFormData, supabase]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  // Tambahkan log saat draft dihapus
  const deleteDraft = useCallback(async () => {
    if (!currentUserId || !arsipId) return;
    const { error } = await supabase
      .from(DRAFT_TABLE_NAME)
      .delete()
      .eq("user_id", currentUserId)
      .eq("arsip_id", arsipId);
    if (error) {
      console.error("Gagal menghapus draft alih media:", error);
    } else {
      console.info("Draft alih media dihapus untuk user_id:", currentUserId, "arsip_id:", arsipId);
    }
  }, [currentUserId, arsipId, supabase]);

  return { loadDraft, saveDraft, deleteDraft };
}