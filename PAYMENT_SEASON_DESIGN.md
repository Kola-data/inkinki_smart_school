# Payment Season Table Design

## Overview
The `payment_seasons` table will manage payment collection periods (seasons/terms) for schools. This replaces the hardcoded term strings in the fee_management table with a structured, manageable system.

## Table Structure

### Table Name: `payment_seasons`

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `season_id` | UUID | PRIMARY KEY, NOT NULL | Unique identifier for the payment season |
| `school_id` | UUID | FOREIGN KEY → schools.school_id, NOT NULL, INDEXED | School this season belongs to |
| `academic_id` | UUID | FOREIGN KEY → academic_years.academic_id, NULLABLE, INDEXED | Academic year this season belongs to (optional) |
| `season_name` | VARCHAR(255) | NOT NULL | Name of the season (e.g., "First Term", "Second Term", "Third Term", "Annual", "Mid-Term") |
| `season_code` | VARCHAR(50) | NULLABLE, UNIQUE per school | Short code for the season (e.g., "T1", "T2", "T3", "ANN") |
| `start_date` | DATE | NOT NULL | Start date of the payment season |
| `end_date` | DATE | NOT NULL | End date of the payment season |
| `due_date` | DATE | NULLABLE | Payment due date (deadline for payments) |
| `sequence_order` | INTEGER | NOT NULL, DEFAULT 0 | Order for displaying seasons (1, 2, 3, etc.) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether this season is currently active |
| `is_current` | BOOLEAN | NOT NULL, DEFAULT false | Whether this is the current payment season |
| `description` | TEXT | NULLABLE | Additional description or notes |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete flag |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Record last update timestamp |

## Relationships

1. **School**: Many-to-One
   - Each payment season belongs to one school
   - A school can have many payment seasons

2. **Academic Year**: Many-to-One (Optional)
   - Each payment season can belong to one academic year
   - An academic year can have many payment seasons
   - If NULL, the season applies to all academic years

3. **Fee Management**: One-to-Many (Future)
   - Each payment season can have many fee management records
   - Fee management will reference `season_id` instead of `term` string

## Indexes

```sql
CREATE INDEX idx_payment_seasons_school_id ON payment_seasons(school_id);
CREATE INDEX idx_payment_seasons_academic_id ON payment_seasons(academic_id);
CREATE INDEX idx_payment_seasons_is_active ON payment_seasons(is_active);
CREATE INDEX idx_payment_seasons_is_current ON payment_seasons(is_current);
CREATE UNIQUE INDEX idx_payment_seasons_school_code ON payment_seasons(school_id, season_code) WHERE season_code IS NOT NULL;
```

## Sample Data

### Example 1: Standard 3-Term System
```json
[
  {
    "season_id": "uuid-1",
    "school_id": "school-uuid-1",
    "academic_id": "academic-uuid-2024",
    "season_name": "First Term",
    "season_code": "T1",
    "start_date": "2024-01-15",
    "end_date": "2024-04-15",
    "due_date": "2024-02-15",
    "sequence_order": 1,
    "is_active": true,
    "is_current": true,
    "description": "First term of 2024 academic year",
    "is_deleted": false
  },
  {
    "season_id": "uuid-2",
    "school_id": "school-uuid-1",
    "academic_id": "academic-uuid-2024",
    "season_name": "Second Term",
    "season_code": "T2",
    "start_date": "2024-05-01",
    "end_date": "2024-08-01",
    "due_date": "2024-06-01",
    "sequence_order": 2,
    "is_active": true,
    "is_current": false,
    "description": "Second term of 2024 academic year",
    "is_deleted": false
  },
  {
    "season_id": "uuid-3",
    "school_id": "school-uuid-1",
    "academic_id": "academic-uuid-2024",
    "season_name": "Third Term",
    "season_code": "T3",
    "start_date": "2024-09-01",
    "end_date": "2024-12-15",
    "due_date": "2024-10-01",
    "sequence_order": 3,
    "is_active": true,
    "is_current": false,
    "description": "Third term of 2024 academic year",
    "is_deleted": false
  }
]
```

### Example 2: Annual Payment System
```json
[
  {
    "season_id": "uuid-4",
    "school_id": "school-uuid-2",
    "academic_id": "academic-uuid-2024",
    "season_name": "Annual Fee",
    "season_code": "ANN",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "due_date": "2024-02-28",
    "sequence_order": 1,
    "is_active": true,
    "is_current": true,
    "description": "Annual payment for entire year",
    "is_deleted": false
  }
]
```

### Example 3: Semester System
```json
[
  {
    "season_id": "uuid-5",
    "school_id": "school-uuid-3",
    "academic_id": "academic-uuid-2024",
    "season_name": "First Semester",
    "season_code": "S1",
    "start_date": "2024-01-15",
    "end_date": "2024-06-30",
    "due_date": "2024-02-15",
    "sequence_order": 1,
    "is_active": true,
    "is_current": true,
    "description": "First semester of 2024",
    "is_deleted": false
  },
  {
    "season_id": "uuid-6",
    "school_id": "school-uuid-3",
    "academic_id": "academic-uuid-2024",
    "season_name": "Second Semester",
    "season_code": "S2",
    "start_date": "2024-07-15",
    "end_date": "2024-12-15",
    "due_date": "2024-08-15",
    "sequence_order": 2,
    "is_active": true,
    "is_current": false,
    "description": "Second semester of 2024",
    "is_deleted": false
  }
]
```

### Example 4: Custom Seasons (with Mid-Term)
```json
[
  {
    "season_id": "uuid-7",
    "school_id": "school-uuid-4",
    "academic_id": "academic-uuid-2024",
    "season_name": "First Term",
    "season_code": "T1",
    "start_date": "2024-01-15",
    "end_date": "2024-03-15",
    "due_date": "2024-02-01",
    "sequence_order": 1,
    "is_active": true,
    "is_current": true,
    "description": null,
    "is_deleted": false
  },
  {
    "season_id": "uuid-8",
    "school_id": "school-uuid-4",
    "academic_id": "academic-uuid-2024",
    "season_name": "Mid-Term",
    "season_code": "MT",
    "start_date": "2024-03-16",
    "end_date": "2024-04-30",
    "due_date": "2024-04-01",
    "sequence_order": 2,
    "is_active": true,
    "is_current": false,
    "description": "Mid-term payment period",
    "is_deleted": false
  },
  {
    "season_id": "uuid-9",
    "school_id": "school-uuid-4",
    "academic_id": "academic-uuid-2024",
    "season_name": "Second Term",
    "season_code": "T2",
    "start_date": "2024-05-01",
    "end_date": "2024-07-31",
    "due_date": "2024-06-01",
    "sequence_order": 3,
    "is_active": true,
    "is_current": false,
    "description": null,
    "is_deleted": false
  },
  {
    "season_id": "uuid-10",
    "school_id": "school-uuid-4",
    "academic_id": "academic-uuid-2024",
    "season_name": "Third Term",
    "season_code": "T3",
    "start_date": "2024-08-01",
    "end_date": "2024-12-15",
    "due_date": "2024-09-01",
    "sequence_order": 4,
    "is_active": true,
    "is_current": false,
    "description": null,
    "is_deleted": false
  }
]
```

## Business Rules

1. **Only one current season per school**: When setting a season as `is_current = true`, all other seasons for that school should be set to `is_current = false`

2. **Date validation**: 
   - `end_date` must be after `start_date`
   - `due_date` should typically be between `start_date` and `end_date` (but can be flexible)

3. **Sequence order**: Should be unique per school (or per school + academic_year if academic_id is set)

4. **Season code uniqueness**: Must be unique per school (if provided)

5. **Active seasons**: Only active seasons should be available for selection in fee management

## Migration Strategy

### Phase 1: Create payment_seasons table
- Create the table structure
- Add indexes
- Create initial seasons for existing schools (based on current term usage)

### Phase 2: Update fee_management table
- Add `season_id` column (nullable initially)
- Migrate existing `term` strings to `season_id` references
- Make `season_id` required after migration

### Phase 3: Frontend updates
- Replace hardcoded term dropdowns with dynamic season selection
- Update fee management forms to use seasons
- Add season management UI

## API Endpoints (To be implemented)

```
GET    /payment-seasons/                    # List all seasons (paginated, filtered by school_id, academic_id)
GET    /payment-seasons/{season_id}         # Get single season
POST   /payment-seasons/                    # Create new season
PUT    /payment-seasons/{season_id}         # Update season
DELETE /payment-seasons/{season_id}         # Soft delete season
PATCH  /payment-seasons/{season_id}/set-current  # Set as current season
GET    /payment-seasons/current/{school_id} # Get current season for school
```

## Use Cases

1. **School Admin creates payment seasons** for an academic year
2. **Fee Management** references payment seasons instead of hardcoded terms
3. **Reports** can filter by payment season
4. **Due date tracking** for payment reminders
5. **Season-based analytics** (e.g., "How much was collected in First Term?")

## Questions to Consider

1. Should seasons be tied to academic years, or can they span multiple years?
   - **Recommendation**: Make it optional (nullable academic_id) for flexibility

2. Can seasons overlap?
   - **Recommendation**: Allow overlap but warn in UI if dates overlap

3. What happens to fee_management records when a season is deleted?
   - **Recommendation**: Soft delete only, or prevent deletion if season has associated fees

4. Should we support recurring seasons (auto-create for each academic year)?
   - **Recommendation**: Future enhancement - template system

