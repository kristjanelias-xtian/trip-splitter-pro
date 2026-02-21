-- Receipt tasks: tracks AI receipt scanning state and results
CREATE TABLE receipt_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'review', 'complete', 'failed')),
  receipt_image_path TEXT,
  extracted_merchant TEXT,
  extracted_items JSONB,       -- [{ name: string, price: number, qty: number }]
  extracted_total NUMERIC(10,2),
  extracted_currency TEXT,
  confirmed_total NUMERIC(10,2),
  tip_amount NUMERIC(10,2) DEFAULT 0,
  mapped_items JSONB,          -- [{ item_index: number, participant_ids: string[] }]
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipt_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own receipt tasks"
  ON receipt_tasks FOR ALL
  USING (created_by = auth.uid());

-- Private storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Users can read their own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Users can delete their own receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts');
