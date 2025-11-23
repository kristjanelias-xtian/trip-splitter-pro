export type ExpenseCategory =
  | 'Accommodation'
  | 'Food'
  | 'Activities'
  | 'Training'
  | 'Transport'
  | 'Other';

export type DistributionType = 'individuals' | 'families' | 'mixed';

export interface IndividualsDistribution {
  type: 'individuals';
  participants: string[]; // participant IDs
}

export interface FamiliesDistribution {
  type: 'families';
  families: string[]; // family IDs
}

export interface MixedDistribution {
  type: 'mixed';
  families?: string[]; // family IDs
  participants?: string[]; // participant IDs
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
}
