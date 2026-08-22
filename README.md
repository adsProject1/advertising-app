# PromoTrack — Advertisement Campaign & Field Activity Management System

A clickable HTML / CSS / vanilla JavaScript **wireframe prototype** for an advertisement and product-promotion agency that runs field promotion activities.

This build has **no backend, no database, and no real authentication, GPS, camera or file upload APIs**. All data is mock data, seeded into `localStorage` on first load, so the prototype can be demonstrated end-to-end in a browser with zero setup.

**Status:** this wireframe is the client-accepted **MMP** (Minimum Marketable Product) — the agreed functional baseline for the production build. See [Production rebuild](#production-rebuild) below for the target stack and where the specs live.

---

## What's in this prototype

Two applications, sharing one in-browser dataset:

### 1. Desktop Admin application
Used by agency operations staff to run the business:
- Add and manage **Activities** — a flat list, each with an auto-generated numeric Activity Number (`10001`, `10002`, ...), a State Name, AO Name, Period (date range), one or more Elements, and a Number of Team/Vans with a location per team/van (all location boxes are shown at once, matching the count entered; each one is optional — an activity saves fine with the count filled in and every location left blank)
- Review **Submissions** — field evidence (photos) submitted by mobile users, auto-approved on submit, with a fullscreen zoomable photo viewer
- Dashboard view for activity/submission overview

There is **no agent roster**. Field officers are assigned to activities offline (outside the system); access to the mobile app is controlled entirely by the Activity Number.

### 2. Android Agent application (mobile web view)
Used by field officers on the ground:
- Log in with **Activity Number + Team No + Mobile Number + OTP** — Activity Number, Team No and mobile number are all numeric-only entry (non-digits are blocked as you type), not checked against any roster
- Home starts empty except a **Start Submission** button
- Start Submission flow: select which of the activity's elements this photo covers (checkboxes, elements can be reused across rounds) → capture a mock photo → repeat as needed
- A minimum of **3 photos** *and* a non-empty free-text **Submission Name** are required before **Submit All** is enabled; it sends every captured photo as one submission, auto-approved instantly
- **Cancel Submission** discards the whole in-progress round (with a confirmation) without submitting anything
- Submitting doesn't lock the activity — Home always offers Start Submission again, so a field officer can submit multiple times for the same activity
- See a personal history of what that mobile number has submitted — tap any entry to open a full detail view with a photo preview grid (tap a photo for a fullscreen, zoomable lightbox)

Because both apps read and write the same `localStorage` state, a submission made on the mobile app immediately shows up in the Desktop app's Submissions list (and vice versa — an Activity created on desktop is what the mobile app logs into).

---

## How to run it

No build step, no dependencies. Either:

1. **Open directly**: double-click `index.html` (or open it in a browser via `File → Open`).
2. **Or serve it locally** (recommended, avoids any browser file:// restrictions):
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
   then visit `http://localhost:8080`.

From the landing page, use the **Desktop Admin** or **Android Agent** card (or the small "Prototype Switcher" pill in the top-right) to enter either application.

---

## Demo mobile login

```
Activity Number : 10001
Team No         : a serial number starting from 1 (e.g. 1, 2, 3 — not 0, not padded like 01)
Mobile Number   : any 10-digit number (e.g. 9876543210)
OTP             : 123456
```

`10001 — Phoenix Mall Pune` already has an approved submission seeded (so do `10002` and `10005`), so Home shows that submission's summary alongside the still-available Start Submission button. `10003` has no submission yet and only one element ("Photo Booth Activation") — good for demoing that the same element can be selected repeatedly to reach the 3-photo minimum. `10002` and other activities have varied States/AO Names/Periods to demo the desktop filters.

---

## Suggested end-to-end walkthrough

**Desktop:**
`Dashboard → Activities → + Add Activity → Activity Detail → Submissions → Submission Detail`

**Mobile:**
`Login (10003 / any Team No / any mobile) → OTP (123456) → Home (Start Submission) → Select Elements → Capture Photo → Home (staged, repeat until 3+ photos) → type a Submission Name → Submit All → Success → Home (still offers Start Submission again)`

After submitting on mobile, switch to the Desktop app's **Submissions** page (or that Activity's Detail page) in the same browser — the new submission appears immediately, already Approved.

---

## Project structure

```
advertising app/
├── index.html                  Landing page + prototype switcher
├── assets/                     Sample submission photos (1.jpg – 7.jpg), used to mock
│                               photo evidence on the Submission Detail page
├── docs/                       Production rebuild specs (not part of the prototype) — mmp-spec.md,
│                               project-setup-plan.md, models/*.model.js, apiCalls.txt, swagger.yml
├── css/
│   ├── styles.css              Shared design system (tokens, buttons, tables, badges, forms,
│   │                           modals, toasts, element-tiles...)
│   ├── desktop.css             Desktop shell layout (header, sidebar, cards, detail pages, photo gallery/lightbox)
│   └── mobile.css              Mobile app shell (phone frame, bottom nav, Add Photo flow, etc.)
├── js/
│   ├── mock-data.js            Seed data: activities, submissions + lookup lists (states, AO names, elements)
│   ├── app.js                  Shared state (localStorage), ID generation, computed status, element-tile helpers, UI helpers
│   ├── desktop.js              Desktop Admin page controllers
│   └── mobile.js               Android Agent page controllers + Add Photo flow
└── pages/
    ├── desktop/                7 pages: dashboard, activities, activity-create, activity-detail,
    │                           submissions, submission-detail, settings
    └── mobile/                 8 pages: login, otp, home, capture, success, history,
                                submission-detail, profile
```

---

## Business rules implemented

- Activity is the only entity — no Event grouping, no separate Task records.
- Activity Numbers (`10001…`) and Submission Numbers (`10001…`) are plain numeric strings, always auto-generated, never typed by the user.
- There is no agent/user roster. Activities are assigned to field officers offline; a field officer's only credentials are the Activity Number, a self-entered Team No (a serial number starting from 1), and a mobile number + OTP — none checked against a roster.
- A field officer can execute any Activity they log into, tagging each captured photo with the elements it covers.
- Submissions are **auto-approved** the moment they're submitted — there is no manual review/approve/reject step.
- **There is no delete.** Activities and Submissions can be created and edited but never removed — matching the production design.

---

## Production rebuild

This wireframe is the accepted functional baseline. The production build is a separate codebase on this stack:

| Layer | Technology |
|---|---|
| Desktop Admin | **React.js** |
| Android Agent app | **React Native (Expo)** |
| Backend | **Node.js (Express)** — one service for both clients |
| Database | **MongoDB** (Mongoose) |

A single backend service on one base URL serves both the dashboard web app and the Android app. Sessions are JWTs issued after a mobile-number + OTP login (OTP delivered over MSG91); submission photos travel base64-encoded inside the create-submission call and are written to an NFS server.

Specs live in `docs/`:

| File | What it covers |
|---|---|
| `docs/mmp-spec.md` | Product & technical spec — workflows, data flow, data models, REST API, architecture, open questions |
| `docs/project-setup-plan.md` | Build plan — how to scaffold all three projects, dependencies, folder structures, milestones |
| `docs/models/*.model.js` | Mongoose schemas (User, Activity, Submission, Element) |
| `docs/models/apiCalls.txt` | Worked request/response examples for every endpoint |
| `docs/models/swagger.yml` | OpenAPI 3.1 definition |

Where production deliberately departs from this wireframe:

- **Real accounts.** Every user (admin / regional manager / field officer) is created upfront by a super admin — there is still no self-signup, but the desktop app gains a login, and the mobile Team No is picked from the Activity's predefined team/van list instead of typed freely.
- **Activity status.** Production adds an `active`/`inactive` switch on an Activity; neither the prototype nor production has any delete operation.
- **Real device APIs.** Camera, GPS and offline capture queueing replace the mocks used here.

---

## Limitations (by design, for this phase)

This is a UI/UX and workflow wireframe only. It intentionally has **no** real backend, REST API, database, JWT auth, SMS/OTP gateway, GPS/camera hardware access, cloud storage, push notifications, or offline sync — all of that is simulated with mock data and `localStorage` for demonstration purposes, and arrives in the production rebuild described above.

Use **Settings → Reset Demo Data** in the Desktop app at any time to restore the original seed dataset.
