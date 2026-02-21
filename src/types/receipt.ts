export type ReceiptTaskStatus = 'pending' | 'processing' | 'review' | 'complete' | 'failed';

export interface ExtractedItem {
  name: string;
  price: number;
  qty: number;
}

export interface MappedItem {
  item_index: number;
  participant_ids: string[];
}

export interface ReceiptTask {
  id: string;
  trip_id: string;
  created_by: string;
  status: ReceiptTaskStatus;
  receipt_image_path: string | null;
  extracted_merchant: string | null;
  extracted_items: ExtractedItem[] | null;
  extracted_total: number | null;
  extracted_currency: string | null;
  confirmed_total: number | null;
  tip_amount: number;
  mapped_items: MappedItem[] | null;
  expense_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReceiptTaskInput {
  trip_id: string;
  receipt_image_path?: string;
}
