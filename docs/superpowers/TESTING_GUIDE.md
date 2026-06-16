# Manual Testing Guide: Ministry-Based Form Access

## Setup

### 1. Start Backend + Local Database

```bash
cd backend
docker compose up -d  # Start PostgreSQL
npm run start:dev     # Start backend at http://localhost:3001
```

### 2. Create Test User Accounts

Using the admin-ui or direct database inserts, create these test users:

#### User A: "Member" — Global Role `member`, Atmosfera Member Only
- Email: `member@test.com`
- Password: Use Firebase Console or direct insert
- Global Role: `member`
- Atmosfera Ministry: Add to `ministry_members` table (NOT a leader)
- Expected: Can **write** service-reports, cannot **read** list

#### User B: "Leader" — Global Role `member`, Atmosfera Team Leader
- Email: `leader@test.com`
- Global Role: `member`
- Atmosfera Ministry → Any Team: Add as `leader` or `co_leader`
- Expected: Can **read** submissions list AND **write** new reports

#### User C: "Admin"
- Global Role: `admin`
- Expected: Full access to everything, unconditionally

---

## Backend Tests

### Test 1: Forms Catalog Endpoint (`GET /api/forms`)

**1.1 Test as Member (User A)**
```bash
curl -H "Authorization: Bearer <USER_A_TOKEN>" \
  http://localhost:3001/api/forms | jq '.[] | select(.slug=="service-reports")'
```

**Expected Output:**
```json
{
  "slug": "service-reports",
  "name": "Relatório do Culto",
  "can_write": true,     // ← member can write
  "can_read": false      // ← member CANNOT read (no leader status)
}
```

**1.2 Test as Leader (User B)**
```bash
curl -H "Authorization: Bearer <USER_B_TOKEN>" \
  http://localhost:3001/api/forms | jq '.[] | select(.slug=="service-reports")'
```

**Expected Output:**
```json
{
  "slug": "service-reports",
  "can_write": true,     // ← leader can write
  "can_read": true       // ← leader CAN read
}
```

**1.3 Test as Admin (User C)**
```bash
curl -H "Authorization: Bearer <USER_C_TOKEN>" \
  http://localhost:3001/api/forms | jq '.[] | select(.slug=="service-reports")'
```

**Expected Output:**
```json
{
  "can_write": true,     // ← always true for admin
  "can_read": true       // ← always true for admin
}
```

---

### Test 2: POST /api/forms/service-reports (Create)

**2.1 Member Creates Report (User A) — SHOULD SUCCEED**
```bash
curl -X POST \
  -H "Authorization: Bearer <USER_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-16",
    "report_type": "culto_celebracao",
    "period": "manha",
    "atmosphere_responsible": "Maria",
    "tadel_adults": 20,
    "tadel_kids": 5,
    "vehicles_cars": 3,
    "vehicles_motos": 0,
    "vehicles_bikes": 0,
    "volunteers_atmosfera": 4,
    "volunteers_louvor": 2,
    "volunteers_midia": 1,
    "volunteers_danca": 1,
    "notes": "Great service"
  }' \
  http://localhost:3001/api/forms/service-reports
```

**Expected:** 201 Created, submission ID returned

**2.2 Non-Member Creates Report (a `member` user NOT in Atmosfera) — SHOULD FAIL**
```bash
# Same request, but with a different user token
# Expected: 403 Forbidden
```

---

### Test 3: GET /api/forms/service-reports (List)

**3.1 Member Lists Reports (User A) — SHOULD FAIL**
```bash
curl -H "Authorization: Bearer <USER_A_TOKEN>" \
  http://localhost:3001/api/forms/service-reports
```

**Expected:** 403 Forbidden (members can't read list, even if they can write)

**3.2 Leader Lists Reports (User B) — SHOULD SUCCEED**
```bash
curl -H "Authorization: Bearer <USER_B_TOKEN>" \
  http://localhost:3001/api/forms/service-reports
```

**Expected:** 200 OK with array of all service-reports (with `submittedBy` and `atmosphereTeam` relations)

**Example Response:**
```json
[
  {
    "id": "uuid-1",
    "date": "2026-06-16",
    "report_type": "culto_celebracao",
    "period": "manha",
    "atmosphere_responsible": "Maria",
    "tadel_adults": 20,
    "tadel_kids": 5,
    "submitted_by": {
      "id": 10,
      "name": "Maria"
    },
    "created_at": "2026-06-16T14:30:00Z"
  }
]
```

**3.3 Admin Lists Reports (User C) — SHOULD SUCCEED**
```bash
curl -H "Authorization: Bearer <USER_C_TOKEN>" \
  http://localhost:3001/api/forms/service-reports
```

**Expected:** 200 OK, full list (same as leader)

---

### Test 4: GET /api/forms/service-reports/:id (Detail)

**4.1 Member Reads Detail (User A) — SHOULD FAIL**
```bash
curl -H "Authorization: Bearer <USER_A_TOKEN>" \
  http://localhost:3001/api/forms/service-reports/<SUBMISSION_ID>
```

**Expected:** 403 Forbidden

**4.2 Leader Reads Detail (User B) — SHOULD SUCCEED**
```bash
curl -H "Authorization: Bearer <USER_B_TOKEN>" \
  http://localhost:3001/api/forms/service-reports/<SUBMISSION_ID>
```

**Expected:** 200 OK with full submission details

---

## Admin-UI Tests

### Test 5: Admin-UI Forms Hub

**5.1 Login as User A (Member)**
1. Open http://localhost:3000
2. Sign in with User A email
3. Navigate to **Formulários** (Forms hub)

**Expected:**
- "Relatório do Culto" card shows **"Novo registro" button only** (no submissions table)
- Clicking the card opens the form submission screen

**5.2 Login as User B (Leader)**
1. Sign out of User A
2. Sign in with User B email
3. Navigate to Formulários

**Expected:**
- "Relatório do Culto" card shows **submissions list table**
- Table columns: Date, Period, Responsible, Adults, Kids, etc.
- Clicking card/row navigates to read-only detail view
- "Novo registro" FAB (bottom-right) or button navigates to form submission

**5.3 Login as User C (Admin)**
1. Sign out, sign in with Admin email
2. Navigate to Formulários

**Expected:**
- Full read+write access
- Both list AND form submission available
- Can edit/delete existing submissions (20-minute window applies via `FormSubmissionPolicyService`)

---

## KMP (Android) Tests

### Prerequisites
```bash
cd kmp-mobile
./gradlew :android:installDebug  # Install APK on emulator/device
# Or open android/ in Android Studio and run
```

### Test 6: Android Formulários Screen

**6.1 Member (User A) Opens Formulários**
1. Launch app, authenticate as User A
2. Navigate to **Account** → **Formulários**

**Expected:**
- "Relatório do Culto" card visible
- Tapping card opens **form submission screen** (NOT a list)
- Can fill and submit the form

**6.2 Leader (User B) Opens Formulários**
1. Authenticate as User B
2. Navigate to Formulários

**Expected:**
- Tapping "Relatório do Culto" card opens **FormSubmissionsListScreen**
- List shows all submissions with date, period, responsible, adult/kid counts
- Tapping a row opens read-only detail (key-value pairs)
- Detail screen shows: Data, Tipo, Período, Responsável, Adultos, Crianças, Carros, Motos, Voluntários, Observações

**6.3 Admin Opens Formulários**
1. Authenticate as User C
2. Navigate to Formulários

**Expected:**
- Same as leader (full read+write access)

---

## KMP (iOS) Tests

### Prerequisites
```bash
cd kmp-mobile/ios
open PazChurch.xcodeproj
# Build & run on iOS Simulator (Cmd+R in Xcode)
```

### Test 7: iOS Formulários Screen

**7.1 Member (User A)**
1. Launch app, authenticate as User A
2. Navigate to Account → Formulários

**Expected:**
- Tapping "Relatório do Culto" opens form submission screen
- Can fill and submit

**7.2 Leader (User B)**
1. Authenticate as User B
2. Navigate to Formulários

**Expected:**
- Tapping card opens FormSubmissionsListView
- List shows submissions with date, period, responsible, counts
- Tapping row opens FormSubmissionDetailView (read-only key-value pairs)

**7.3 Admin (User C)**
1. Authenticate as User C
2. Navigate to Formulários

**Expected:**
- Full access (same as leader)

---

## Edge Cases & Additional Tests

### Test 8: Non-Atmosfera Member

**Setup:** Create User D with global role `member` but NOT in any Atmosfera ministry/team

**8.1 Check Forms Catalog**
```bash
curl -H "Authorization: Bearer <USER_D_TOKEN>" \
  http://localhost:3001/api/forms | jq '.[] | select(.slug=="service-reports")'
```

**Expected:**
- Service-reports **NOT in the list** (filtered out because `can_read=false` AND `can_write=false`)

**8.2 Try to Create Report**
```bash
curl -X POST \
  -H "Authorization: Bearer <USER_D_TOKEN>" \
  -H "Content-Type: application/json" \
  -d {...} \
  http://localhost:3001/api/forms/service-reports
```

**Expected:** 403 Forbidden

---

### Test 9: Timeout-based Edits

**Setup:** Create a report with User A at a specific time

**9.1 Edit within 24 hours**
```bash
curl -X PATCH \
  -H "Authorization: Bearer <USER_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Updated"}' \
  http://localhost:3001/api/forms/service-reports/<SUBMISSION_ID>
```

**Expected:** 200 OK (submitter can edit their own report within 24h)

**9.2 Admin edits anytime**
```bash
curl -X PATCH \
  -H "Authorization: Bearer <USER_C_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Admin update"}' \
  http://localhost:3001/api/forms/service-reports/<SUBMISSION_ID>
```

**Expected:** 200 OK (admin can always edit)

---

## Summary Checklist

- [ ] **Backend catalog:** Member sees write-only, Leader sees read+write, Admin sees both
- [ ] **Backend create:** Member ✓, Non-member ✗, Admin ✓
- [ ] **Backend list:** Member ✗, Leader ✓, Admin ✓
- [ ] **Backend detail:** Member ✗, Leader ✓, Admin ✓
- [ ] **Admin-UI member:** Form submission only
- [ ] **Admin-UI leader:** List + form submission
- [ ] **Android member:** Form submission only
- [ ] **Android leader:** Submissions list with detail view
- [ ] **iOS member:** Form submission only
- [ ] **iOS leader:** Submissions list with detail view
- [ ] **Non-Atmosfera member:** Service-reports not in catalog

---

## Troubleshooting

### "403 Forbidden" when should be allowed
- Check User B is actually a leader in the database: `SELECT * FROM ministry_teams WHERE leader_id = ? OR co_leader_id = ?`
- Check ministry slug is `'atmosfera'` (case-sensitive)
- Verify JWT token is valid and not expired

### "Member sees read access they shouldn't"
- Check `membership_mode` on the Atmosfera ministry — should be `'teams'` or `'direct'`
- Verify the user is not also a `leader` or `co_leader` accidentally

### App crashes on submissions list
- Ensure backend is running and `GET /api/forms/service-reports` returns valid JSON
- Check network connectivity in emulator/simulator

### Forms catalog shows old flags
- Backend caches nothing; clear app cache if testing multiple times: `npm run start:dev` restarts the server
