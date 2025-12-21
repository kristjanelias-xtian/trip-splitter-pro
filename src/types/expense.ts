export type ExpenseCategory =
  | 'Accommodation'
  | 'Food'
  | 'Activities'
  | 'Training'
  | 'Transport'
  | 'Other';

export type SplitMode = 'equal' | 'percentage' | 'amount';

export type DistributionType = 'individuals' | 'families' | 'mixed';

// Split data for percentage and amount modes
export interface ParticipantSplit {
  participantId: string;
  value: number; // percentage (0-100) or amount
}

export interface FamilySplit {
  familyId: string;
  value: number; // percentage (0-100) or amount
}

export interface IndividualsDistribution {
  type: 'individuals';
  participants: string[]; // participant IDs
  splitMode?: SplitMode; // defaults to 'equal' if not specified
  participantSplits?: ParticipantSplit[]; // for percentage/amount modes
}

export interface FamiliesDistribution {
  type: 'families';
  families: string[]; // family IDs
  splitMode?: SplitMode; // defaults to 'equal' if not specified
  familySplits?: FamilySplit[]; // for percentage/amount modes
  accountForFamilySize?: boolean; // if true, split proportionally by family size; if false/undefined, treat families as units
}

export interface MixedDistribution {
  type: 'mixed';
  families: string[]; // family IDs
  participants: string[]; // participant IDs
  splitMode?: SplitMode; // defaults to 'equal' if not specified
  familySplits?: FamilySplit[]; // for percentage/amount modes
  participantSplits?: ParticipantSplit[]; // for percentage/amount modes
  accountForFamilySize?: boolean; // if true, split proportionally by family size; if false/undefined, families are still counted by size in mixed mode
}

export type ExpenseDistribution =
  | IndividualsDistribution
  | FamiliesDistribution
  | MixedDistribution;

export interface Expense {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: string; // participant ID (adult only)
  distribution: ExpenseDistribution;
  category: ExpenseCategory;
  expense_date: string; // ISO date string
  comment?: string | null;
  meal_id?: string | null; // Optional link to restaurant meal
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  trip_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: string;
  distribution: ExpenseDistribution;
  category: ExpenseCategory;
  expense_date?: string; // Optional, defaults to today
  comment?: string;
  meal_id?: string; // Optional link to restaurant meal
}

export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  currency?: string;
  paid_by?: string;
  distribution?: ExpenseDistribution;
  category?: ExpenseCategory;
  expense_date?: string;
  comment?: string;
  meal_id?: string; // Optional link to restaurant meal
}
