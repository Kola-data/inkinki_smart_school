# API Integration Best Practices - Test Marks (Assessment Marks)

## Critical API Requirements

### 1. **ID Field Naming**
- **CRITICAL**: The API uses `ass_mark_id` (NOT `test_mark_id`)
- Always use `ass_mark_id` for:
  - PUT requests: `/api/v1/test-marks/{ass_mark_id}`
  - DELETE requests: `/api/v1/test-marks/{ass_mark_id}`
  - GET by ID: `/api/v1/test-marks/{ass_mark_id}`

### 2. **Field Name Mapping**
The API uses different field names than the frontend:

| Frontend Field | API Field | Notes |
|---------------|-----------|-------|
| `test_mark_id` | `ass_mark_id` | **CRITICAL** - Use for all API operations |
| `test_mark` | `ass_mark` | Number (0-100) |
| `test_avg_mark` | `ass_avg_mark` | Number (0-100) or null |
| `academic_year_name` | `academic_name` | String |

### 3. **API Endpoints**

#### POST `/api/v1/test-marks/` - Create
- **No path parameters**
- **Request Body** (all fields required):
```json
{
  "school_id": "uuid",
  "std_id": "uuid",
  "subj_id": "uuid",
  "cls_id": "uuid",
  "academic_id": "uuid",
  "term": "string",
  "ass_avg_mark": 0,
  "ass_mark": 0,
  "status": "string",
  "is_published": false
}
```

#### PUT `/api/v1/test-marks/{ass_mark_id}` - Update
- **Path Parameter**: `ass_mark_id` (UUID) - **REQUIRED**
- **Query Parameter**: `school_id` (UUID) - **REQUIRED**
- **Request Body** (all fields optional, but recommended to send all):
```json
{
  "school_id": "uuid",
  "std_id": "uuid",
  "subj_id": "uuid",
  "cls_id": "uuid",
  "academic_id": "uuid",
  "term": "string",
  "ass_avg_mark": 0,
  "ass_mark": 0,
  "status": "string",
  "is_published": true
}
```

#### DELETE `/api/v1/test-marks/{ass_mark_id}` - Delete
- **Path Parameter**: `ass_mark_id` (UUID) - **REQUIRED**
- **Query Parameter**: `school_id` (UUID) - **REQUIRED**
- **No request body**

### 4. **Common 404 Errors & Solutions**

#### Error: "Assessment mark not found" (404)

**Possible Causes:**
1. **Wrong ID field used**: Using `test_mark_id` instead of `ass_mark_id`
   - ✅ **Fix**: Always use `ass_mark_id` from API response
   
2. **Record is deleted**: `is_deleted == True` in database
   - ✅ **Fix**: Backend filters deleted records automatically
   - ⚠️ **Note**: Deleted records won't appear in GET requests
   
3. **School ID mismatch**: Record belongs to different school
   - ✅ **Fix**: Ensure `school_id` in query matches record's `school_id`
   
4. **ID not preserved during normalization**: `ass_mark_id` lost during data transformation
   - ✅ **Fix**: Always preserve `ass_mark_id` in normalization:
   ```typescript
   const normalizedData = (data || []).map((record: any) => ({
     ...record,
     // CRITICAL: Preserve ass_mark_id for API calls
     ass_mark_id: record.ass_mark_id || record.test_mark_id,
     // ... other mappings
   }));
   ```

5. **Invalid UUID format**: ID is not a valid UUID
   - ✅ **Fix**: Validate UUID format before API calls:
   ```typescript
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   if (!uuidRegex.test(markId)) {
     // Handle invalid UUID
   }
   ```

### 5. **Data Normalization Best Practices**

Always normalize API responses to preserve original IDs:

```typescript
// ✅ CORRECT - Preserves ass_mark_id
const normalizedData = (data || []).map((record: any) => ({
  ...record,
  // Keep original for API calls
  ass_mark_id: record.ass_mark_id || record.test_mark_id,
  // Map for display
  test_mark_id: record.test_mark_id || record.ass_mark_id,
  test_mark: record.test_mark ?? record.ass_mark,
  test_avg_mark: record.test_avg_mark ?? record.ass_avg_mark,
  academic_year_name: record.academic_year_name || record.academic_name,
}));

// ❌ WRONG - Loses ass_mark_id
const normalizedData = (data || []).map((record: any) => ({
  ...record,
  test_mark_id: record.test_mark_id || record.ass_mark_id,
  // ass_mark_id is lost!
}));
```

### 6. **Update Operation Checklist**

Before calling PUT endpoint, verify:

- [ ] `ass_mark_id` exists and is valid UUID
- [ ] `school_id` is provided in query parameter
- [ ] All required fields are in payload (even if not changing)
- [ ] Number fields (`ass_mark`, `ass_avg_mark`) are converted to numbers
- [ ] UUID fields are valid UUID strings

### 7. **Debugging Tips**

1. **Console Logging**:
   ```typescript
   console.log('Updating test mark:', { 
     markId, 
     schoolId, 
     payload,
     selectedRecord: selectedTestMark 
   });
   ```

2. **Check Network Tab**:
   - Verify the URL: `/api/v1/test-marks/{ass_mark_id}?school_id={school_id}`
   - Verify request body contains all fields
   - Check response status and error details

3. **Verify Record State**:
   ```typescript
   // Before update, verify record has ass_mark_id
   if (!(record as any).ass_mark_id && !record.test_mark_id) {
     console.error('Missing ID:', record);
     return;
   }
   ```

### 8. **Error Handling**

Always provide specific error messages:

```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    toast.error('Test mark not found. It may have been deleted or the ID is incorrect.');
    console.error('404 Details:', { markId, schoolId, record });
  } else if (error.response?.status === 400) {
    toast.error('Invalid data. Please check all fields are correct.');
  } else {
    toast.error(error.response?.data?.detail || 'Failed to update test mark');
  }
}
```

### 9. **Type Safety**

Define interfaces that include both field names:

```typescript
interface TestMarkItem {
  test_mark_id?: string;      // For display
  ass_mark_id?: string;      // For API calls (CRITICAL)
  test_mark?: number;
  ass_mark?: number;         // API field
  // ... other fields
}
```

### 10. **Testing Checklist**

- [ ] Create new record (POST)
- [ ] Update existing record (PUT) with correct `ass_mark_id`
- [ ] Delete record (DELETE) with correct `ass_mark_id`
- [ ] Verify 404 when using wrong ID
- [ ] Verify 404 when record is deleted
- [ ] Verify 400 when sending invalid data
- [ ] Verify data normalization preserves `ass_mark_id`

## Summary

**The #1 Rule**: Always use `ass_mark_id` (not `test_mark_id`) for all API operations that require an ID in the path parameter.

**The #2 Rule**: Always preserve `ass_mark_id` during data normalization - never lose it!

**The #3 Rule**: Always validate UUID format and provide meaningful error messages.

