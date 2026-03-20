-- Expense reactions: emoji reactions on expenses
CREATE TABLE expense_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, participant_id, emoji)
);

CREATE INDEX idx_expense_reactions_expense_id ON expense_reactions(expense_id);

ALTER TABLE expense_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: open to all (trip URL = access token)
CREATE POLICY "expense_reactions_select"
  ON expense_reactions FOR SELECT
  USING (true);

-- INSERT: authenticated users, participant must be linked to auth user
CREATE POLICY "expense_reactions_insert"
  ON expense_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
        AND participants.user_id = auth.uid()
    )
  );

-- DELETE: authenticated users, can only remove own reactions
CREATE POLICY "expense_reactions_delete"
  ON expense_reactions FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
        AND participants.user_id = auth.uid()
    )
  );
