import { useEffect } from "react";
import { debounce } from "lodash";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";

const supabase = createClient();

export function useFormDraft<T extends object>(
  formData: T,
  currentUserId: string | null,
  editId?: string | null,
  setFormData?: (data: T) => void
) {
  // Save draft with debounce
  useEffect(() => {
    if (!currentUserId || editId) return;
    const saveDraft = debounce(async () => {
      const { error } = await supabase
        .from("draft_input_arsip")
        .upsert(
          {
            user_id: currentUserId,
            data: formData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) {
        toast.error("Gagal menyimpan draft form.");
      }
    }, 5000);
    saveDraft();
    return () => saveDraft.cancel();
  }, [formData, currentUserId, editId]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!currentUserId || editId || !setFormData) return;
      const { data, error } = await supabase
        .from("draft_input_arsip")
        .select("data")
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (error) {
        toast.error("Gagal memuat draft form.");
        return;
      }
      if (data && data.data) {
        setFormData(data.data);
        toast.info("Draft berhasil dimuat.");
      }
    };
    loadDraft();
  }, [currentUserId, editId, setFormData]);
}