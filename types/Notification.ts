// /types/Notification.ts
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  related_entity?: string;
  is_read: boolean;
  created_at: string;
}
