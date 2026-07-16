# UI Testing Guide: Ministry-Based Form Access

Test the feature end-to-end through the apps only (no backend curl commands).

---

## Setup

### 1. Start Everything

```bash
# Terminal 1: Backend
cd backend
docker compose up -d
npm run start:dev
# Should see: "Listening on port 3001"

# Terminal 2: Admin-UI
cd admin-ui
npm run dev
# Should see: "http://localhost:3000"

# Terminal 3: Android (optional)
cd kmp-mobile
./gradlew :android:installDebug
# Or open in Android Studio and run

# Terminal 4: iOS (optional)
cd kmp-mobile/ios
open PazChurch.xcodeproj
# Cmd+R to run on simulator
```

### 2. Create Test Users in Database

Using a SQL client or psql, insert these users:

```sql
-- User A: Member (global role), NO Atmosfera membership
INSERT INTO users (name, email, role_id, created_at) 
VALUES ('Membro Maria', 'member@test.com', 6, now());

-- User B: Member (global role), Atmosfera TEAM LEADER
INSERT INTO users (name, email, role_id, created_at) 
VALUES ('Líder João', 'leader@test.com', 6, now());

-- User C: Admin (global role)
INSERT INTO users (name, email, role_id, created_at) 
VALUES ('Admin Paulo', 'admin@test.com', 1, now());

-- Add User A to Atmosfera members (NOT leader)
INSERT INTO ministry_members (ministry_id, user_id) 
VALUES ((SELECT id FROM ministries WHERE slug='atmosfera'), 10);

-- Add User B as Atmosfera team leader
UPDATE ministry_teams SET leader_id = 11 
WHERE ministry_id = (SELECT id FROM ministries WHERE slug='atmosfera') 
LIMIT 1;
-- Or if team doesn't exist, add User B to ministry directly and make them leader there
UPDATE ministries SET leader_id = 11 WHERE slug='atmosfera';
```

**Verify:** 
```sql
SELECT m.slug, u.name, u.id 
FROM ministry_members m 
JOIN users u ON m.user_id = u.id 
WHERE m.ministry_id = (SELECT id FROM ministries WHERE slug='atmosfera');
```

---

## Test Scenario 1: Admin-UI

### Part A: User A (Member) — Can Submit, Cannot View List

**Step 1: Sign In**
1. Open http://localhost:3000
2. Click **Sign In**
3. Sign in with Google using `member@test.com`
4. Accept permissions

**Step 2: Navigate to Formulários**
1. Click account icon (bottom-right)
2. Tap **Formulários**

**Step 3: Verify Card Behavior**
1. Find "Relatório do Culto" card
2. **Expected:** Shows only **"Novo registro" button**, NO submissions table visible

**Step 4: Submit a Report**
1. Click "Novo registro"
2. Fill form:
   - Date: `16/06/2026`
   - Tipo: `culto_celebracao`
   - Período: `manha`
   - Responsável: `Maria`
   - Adultos (Tadel): `10`
   - Carros: `2`
   - Other fields: Leave as default or fill
3. Click **Enviar**

**Expected:** Report submitted, redirects back to forms list

**Step 5: Try to Access List (Should NOT see it)**
1. Navigate back to Formulários
2. Look at "Relatório do Culto" card
3. **Expected:** Still shows only "Novo registro", NO list table

---

### Part B: User B (Leader) — Can View List AND Submit

**Step 1: Sign Out & Sign In as Leader**
1. Click profile icon
2. Click **Sign Out**
3. Sign in again with `leader@test.com` (Google)

**Step 2: Navigate to Formulários**
1. Click account icon
2. Tap **Formulários**

**Step 3: Verify List Visibility**
1. Find "Relatório do Culto" card
2. **Expected:** Shows **submissions list table** with columns:
   - Data (date)
   - Período
   - Responsável
   - Adultos/Crianças
   - (Other submission fields)

**Step 4: View a Submission**
1. Click any row in the table (e.g., the one User A just created)
2. **Expected:** Opens read-only detail view showing all fields as key-value pairs

**Step 5: Return & Submit New Report**
1. Click back or navigate to Formulários again
2. Click **"Novo registro"** button/FAB
3. Submit a new report (same as User A)
4. Return to list
5. **Expected:** New report appears at top of list

---

### Part C: User C (Admin) — Full Access

**Step 1: Sign Out & Sign In as Admin**
1. Sign out (User B)
2. Sign in with `admin@test.com` (Google)

**Step 2: Navigate to Formulários**
1. Click account icon
2. Tap **Formulários**

**Step 3: Verify Full Access**
1. Find "Relatório do Culto" card
2. **Expected:** Shows **both list AND form submission button**
3. Can view all submissions (read)
4. Can submit new reports (write)
5. Can edit/delete existing reports (within policy window)

---

## Test Scenario 2: Android KMP

### Part A: User A (Member)

**Step 1: Launch & Authenticate**
1. Open app on Android emulator/device
2. Tap **Sign In**
3. Select Google auth
4. Sign in with `member@test.com`

**Step 2: Navigate to Forms**
1. Tap **Account** (bottom nav)
2. Tap **Formulários** (in menu/card)

**Step 3: Verify Form-Only View**
1. Find "Relatório do Culto" card
2. Tap it
3. **Expected:** Opens **form submission screen** (NOT a list)
4. See form fields: Date, Tipo, Período, Responsável, etc.

**Step 4: Submit**
1. Fill in required fields
2. Tap **Enviar**
3. **Expected:** Shows success, returns to forms list

---

### Part B: User B (Leader)

**Step 1: Sign Out & Sign In**
1. Sign out
2. Sign in with `leader@test.com`

**Step 2: Navigate to Forms**
1. Tap Account
2. Tap Formulários

**Step 3: Verify List View**
1. Find "Relatório do Culto" card
2. Tap it
3. **Expected:** Opens **FormSubmissionsListScreen** (NOT form)
4. See list of submissions with:
   - Date · Period
   - Responsible name
   - Adults / Kids count

**Step 4: View Detail**
1. Tap any row in list
2. **Expected:** Opens read-only detail screen
3. See all fields displayed as key-value pairs:
   - Data
   - Tipo
   - Período
   - Responsável
   - Adultos (Tadel)
   - Crianças (Tadel)
   - Carros, Motos, etc.

**Step 5: Return & Submit**
1. Tap back to return to list
2. Look for "+" FAB or "Novo registro" button
3. Tap to open form submission
4. Submit a new report
5. Return to list
6. **Expected:** New report appears at top

---

### Part C: User C (Admin)

**Step 1: Sign In as Admin**
1. Sign out (User B)
2. Sign in with `admin@test.com`

**Step 2: Verify Full Access**
1. Tap Account → Formulários
2. Find "Relatório do Culto"
3. Tap it
4. **Expected:** Opens list (same as leader)
5. Can view submissions AND can access "Novo registro" to submit

---

## Test Scenario 3: iOS KMP

### Part A: User A (Member)

**Step 1: Launch & Authenticate**
1. Open app on iOS simulator
2. Tap **Sign In**
3. Select Google
4. Sign in with `member@test.com`

**Step 2: Navigate to Forms**
1. Tap **Account** (bottom tab)
2. Tap **Formulários** (in menu/list)

**Step 3: Verify Form-Only View**
1. Find "Relatório do Culto" card
2. Tap it
3. **Expected:** Opens **form submission screen**
4. See form fields

**Step 4: Submit**
1. Fill required fields
2. Tap **Enviar**
3. **Expected:** Success, back to forms list

---

### Part B: User B (Leader)

**Step 1: Sign Out & Sign In**
1. Swipe to sign out
2. Sign in with `leader@test.com`

**Step 2: Navigate to Forms**
1. Tap Account
2. Tap Formulários

**Step 3: Verify List View**
1. Find "Relatório do Culto"
2. Tap it
3. **Expected:** Opens **FormSubmissionsListView**
4. See scrollable list of submissions

**Step 4: View Detail**
1. Tap any submission row
2. **Expected:** Opens read-only detail
3. Scrolls through all fields as key-value pairs

**Step 5: Return & Submit**
1. Tap back
2. Find form submission button/FAB
3. Submit new report
4. Return to list
5. **Expected:** New report visible

---

### Part C: User C (Admin)

**Step 1: Sign In as Admin**
1. Sign out
2. Sign in with `admin@test.com`

**Step 2: Verify Full Access**
1. Tap Account → Formulários
2. Tap "Relatório do Culto"
3. **Expected:** Opens list (same as leader)
4. Can view + submit

---

## Quick Pass/Fail Checklist

Print this and mark as you test:

```
ADMIN-UI
─────────────────────────────────────────────
User A (Member):
  ☐ Card shows "Novo registro" only (no list)
  ☐ Can submit report
  ☐ After submit, still no list visible

User B (Leader):
  ☐ Card shows submissions list table
  ☐ Can click row → see read-only detail
  ☐ Can tap "Novo registro" → submit new report
  ☐ New report appears in list after submit

User C (Admin):
  ☐ Card shows both list AND form button
  ☐ Can view all submissions
  ☐ Can submit new reports


ANDROID
─────────────────────────────────────────────
User A (Member):
  ☐ "Relatório do Culto" tap → form screen (NOT list)
  ☐ Can fill & submit form

User B (Leader):
  ☐ "Relatório do Culto" tap → submissions list
  ☐ Can tap row → read-only detail
  ☐ Can tap FAB/button → form submission
  ☐ New report appears in list

User C (Admin):
  ☐ "Relatório do Culto" tap → list (same as leader)


iOS
─────────────────────────────────────────────
User A (Member):
  ☐ "Relatório do Culto" tap → form screen (NOT list)
  ☐ Can submit

User B (Leader):
  ☐ "Relatório do Culto" tap → list view
  ☐ Tap row → detail view
  ☐ Back → submit new report via button
  ☐ New report in list

User C (Admin):
  ☐ "Relatório do Culto" tap → list (same as leader)
```

---

## Expected Behavior Summary

| Action | Member | Leader | Admin |
|--------|--------|--------|-------|
| **See submissions list** | ❌ No | ✅ Yes | ✅ Yes |
| **Submit new report** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View report detail** | ❌ No | ✅ Yes | ✅ Yes |
| **Edit own report** | ✅ Yes (24h) | ✅ Yes (24h) | ✅ Yes (always) |

---

## If Something Breaks

**"Service-reports card doesn't show at all"**
- Check backend is running: `curl http://localhost:3001/api/forms`
- Check user has `can_write: true` for service-reports in response

**"Member sees list (shouldn't)"**
- Database check: Verify user is NOT a leader in `ministry_teams` or `ministries`
- Clear app cache and re-login

**"Leader doesn't see list (should)"**
- Database check: Verify user IS a leader in `ministry_teams` table
- Check ministry slug is exactly `'atmosfera'`
- Restart backend to clear any caches

**"App crashes on list"**
- Check backend `GET /api/forms/service-reports` returns valid JSON
- Restart both backend and app
