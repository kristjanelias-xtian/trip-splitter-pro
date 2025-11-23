# Supabase Database Setup

## Project Configuration
- **Project Reference**: `kojngcoxywrhpxokkuuv`
- **Project URL**: `https://kojngcoxywrhpxokkuuv.supabase.co`
- **Status**: Linked and migrations applied ✅

## Quick Commands

### Apply Migrations
```bash
supabase db push
```

### Regenerate TypeScript Types
```bash
supabase gen types typescript --linked > src/lib/database.types.generated.ts
cp src/lib/database.types.generated.ts src/lib/database.types.ts
```

### Check Migration Status
```bash
supabase migration list
```

### Check Project Status
```bash
supabase status
```

## Applied Migrations (4/4)
1. ✅ `001_initial_schema.sql` - Base tables (trips, families, participants, expenses, settlements, meals, shopping_items)
2. ✅ `002_fix_expenses_schema.sql` - Expense field fixes
3. ✅ `003_fix_settlements_schema.sql` - Settlement column renames
4. ✅ `004_phase6_schema_updates.sql` - Phase 6 updates (start_date, end_date, meal fields, shopping fields)

## Database Schema Summary

### Core Tables
- **trips**: Trip metadata with start_date, end_date, tracking_mode
- **families**: Family groups (adults, children counts)
- **participants**: Individual participants (linked to families)
- **expenses**: Expense tracking with JSONB distribution
- **settlements**: Payment transfers between participants

### Phase 6 Tables
- **meals**: Meal planning (meal_date, meal_type, title, description, responsible_participant_id)
- **shopping_items**: Shopping list (name, category, quantity, notes, is_completed)
- **meal_shopping_items**: Junction table linking meals to shopping items

## Real-time Features
- Shopping list has real-time subscriptions enabled
- Updates propagate instantly across all connected clients

## Notes
- Always regenerate types after applying migrations
- Type assertions may be needed for some complex types (Json → ExpenseDistribution)
- Use `supabase link --project-ref kojngcoxywrhpxokkuuv` if link is lost
