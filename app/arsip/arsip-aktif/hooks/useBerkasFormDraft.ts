"use client";

import { useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";

const DRAFT_TABLE_NAME = "draft_input_berkas_arsip";

export function useBerkasFormDraft<T extends object>(
  formData: T,
  currentUserId: string | null,
  editId?: string | null,
  setFormDataExternal?: (data: T) => void
) {
  const supabase = createClient();
  const setFormData = setFormDataExternal;

  const saveDraft = useCallback(
    debounce(async (currentData: T) => {
      if (!currentUserId || editId) return;
      if (Object.keys(currentData).length === 0) return;

      const { error } = await supabase
        .from(DRAFT_TABLE_NAME)
        .upsert(
          {
            user_id: currentUserId,
            data: currentData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) {
        console.error("Gagal menyimpan draft berkas:", error);
        toast.error("Gagal menyimpan draft form berkas.");
      }
    }, 3000),
    [currentUserId, editId, supabase]
  );

  useEffect(() => {
    saveDraft(formData);
    return () => saveDraft.cancel();
  }, [formData, saveDraft]);

  const loadDraft = useCallback(async () => {
    if (!currentUserId || editId || !setFormData) return;
    const { data, error } = await supabase.from(DRAFT_TABLE_NAME).select("data").eq("user_id", currentUserId).maybeSingle();
    if (error) { toast.error("Gagal memuat draft form berkas."); return; }
    if (data && data.data) { setFormData(data.data as T); toast.info("Draft berkas berhasil dimuat.");}
  }, [currentUserId, editId, setFormData, supabase]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  return { loadDraft, saveDraft };
}