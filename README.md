# FieldVerify — Turn Every Field Visit into Better Master Data

FieldVerify is a mobile-first Progressive Web App (PWA) prototype engineered for field operations, master data verification, and educational institution audits across Bangladesh.

---

### Key Assessment Architecture

* **No Backend Used**: This is a pure frontend-only assessment build. All operational workflows run client-side.
* **IndexedDB Local Persistence Layer**: Powered by Dexie.js (`FieldVerifyDB`) with 8 relational tables (`institutes`, `employees`, `relationships`, `visits`, `observations`, `auditEvents`, `importJobs`, `appSettings`).
* **GPS via Browser Geolocation API**: Live device GPS uses `navigator.geolocation` with typed error detection (permission denial, hardware unavailability, signal timeout, poor accuracy).
* **Demo GPS Engine**: High-fidelity demo location presets allow full demonstration in desktop browsers without physical hardware mobility.
* **PWA & Offline Capability**: PWA compliant with installability, web manifest, offline service worker, and local-first data caching.
* **AI APIs Intentionally Not Required for MVP**: Rule-based geospatial math (Haversine formula), fuzzy Levenshtein string similarity, and separation-of-duties governance are used instead of non-deterministic LLM calls for master data integrity.

---

### 5-to-10 Minute PM Demonstration Scenarios

#### Scenario 1: On-Site Institute Confirmation & Faculty Check (50m Match)
1. Select Demo GPS Preset: **"Scenario 1: ABC Model College (50m Match)"**.
2. As a Marketing Officer (MO), navigate to **Field Check-In / Discover**.
3. The app finds **ABC Model College** (~48m from stored coordinates, within 100m threshold).
4. Click **Check-In / Confirm Institute**.
5. Location card verifies: *"Location matches master coordinates (48m from stored location)"*.
6. Click **Confirm Location** (creates routine location observation).
7. Proceed to **Employee Mapping**: view existing faculty linked to ABC Model College, confirm two staff members.
8. Click **Review & Submit Visit** to conclude visit.

#### Scenario 2: Significant GPS Location Mismatch & Coordinate Update
1. Select Demo GPS Preset: **"Scenario 2: Significant GPS Mismatch (320m drift)"**.
2. MO visits **Dhanmondi Model School**.
3. Location validation detects a 320m mismatch (> 100m gate threshold).
4. MO clicks **"Use Current Location"**.
5. MO enters evidence/reason and confirms the proposal.
6. The proposed coordinate update enters **Pending Verification** queue.
7. Switch role to **Admin / Verifier**, open **Verification Queue**.
8. Inspect proposed coordinates vs existing coordinates, and click **Approve**.
9. The Master Institute coordinates update immediately, and the previous coordinates are preserved in the **Audit History**.

#### Scenario 3: Faculty Search & Cross-Institute Transfer
1. As MO visiting **ABC Model College**, open **Employee Mapping**.
2. Click **"Search Employee"** in master registry.
3. Search for **"Tariqul Islam"** or **"XYZ School"**.
4. The system surfaces:
   * **Current Institute**: XYZ School
   * **Proposed**: ABC Model College
5. Click **"Propose Transfer"**, choose transfer reason, and submit.
6. Switch role to **Admin**, open **Verification Queue**.
7. Click **Approve**: the master employee relationship transitions to ABC Model College, while the previous affiliation is logged as historical.

#### Scenario 4: Register New Candidate Institute & Duplicate Prevention
1. Select Demo GPS Preset: **"Scenario 4: Add New Institute & Duplicate Check"**.
2. MO opens **Field Check-In / Discover** and clicks **"Add New Institute"**.
3. GPS coordinates are automatically pinned from current location.
4. If a name or nearby coordinate matches an existing institute, a real-time **Duplicate Candidate Warning** appears.
5. MO confirms it is genuinely a distinct campus and submits.
6. Observation enters **Pending Verification** for Admin audit and approval.

---

### Data Import Demo
* Navigate to **Admin > Data Import**.
* Click **"Download Sample Institute File"** or **"Download Sample Employee File"** to receive valid ready-to-test CSV templates.
* Click **"Import Institutes File"** or **"Load Sample Test File"** in the wizard to demonstrate 9-step spreadsheet validation, duplicate checks, coordinate bound auditing, and chunked batch insertion.
