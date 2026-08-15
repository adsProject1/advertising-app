# PromoTrack — Advertisement Campaign & Field Activity Management System

A clickable HTML / CSS / vanilla JavaScript **wireframe prototype** for an advertisement and product-promotion agency that runs campaigns, mall activations, roadshows and brand promotions.

This build has **no backend, no database, and no real authentication, GPS, camera or file upload APIs**. All data is mock data, seeded into `localStorage` on first load, so the prototype can be demonstrated end-to-end in a browser with zero setup.

---

## What's in this prototype

Two applications, sharing one in-browser dataset:

### 1. Desktop Admin application
Used by agency operations staff to run the business:
- Create and manage **Events** (campaigns)
- Create and manage **Activities** inside an Event, each with an auto-generated Activity Number (`ACT-10001`, `ACT-10002`, ...)
- Assign field **Agents** to Activities
- Create and manage **Tasks** inside an Activity, with configurable evidence requirements (photo / GPS / timestamp / comment / customer details)
- Monitor task execution and review **Submissions** (approve / reject field evidence)
- Dashboard and Reports views for execution progress

### 2. Android Agent application (mobile web view)
Used by field agents on the ground:
- Log in with **Activity Number + Mobile Number + OTP**
- View the Activity they're assigned to and today's Tasks
- Start a Task and walk through a guided capture flow: **Photo → GPS Location → Timestamp → Comment → Review → Submit**
- See submission status and a history of completed tasks

Because both apps read and write the same `localStorage` state, a task submitted on the mobile app immediately shows up as a submission in the Desktop app's Submissions list (and vice versa — data created on desktop, like new Events/Activities/Agents assignments, is what the mobile app logs into).

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
Activity Number : ACT-10001
Mobile Number   : 9876543210
OTP             : 123456
```

This logs in as **Raj Kumar**, who is assigned to `ACT-10001 — Phoenix Mall Pune` under the *Raksha Bandhan — Hero Bike Promotion* event. His **Morning Photoshoot** task is already completed (approved) in the seed data; **Afternoon Photoshoot**, **Evening Photoshoot** and **Customer Interaction Log** are pending, ready to be executed live in the demo.

Other valid agent logins for the same activity: `9876543212` (Neha Singh), `9876543213` (Priya Verma) — OTP is always `123456`.

---

## Suggested end-to-end walkthrough

**Desktop:**
`Dashboard → Events → Create Event → Event Detail → + Add Activity → assign agents → Activity Detail → + Add Task → Task Detail → Submissions → Submission Detail → Approve / Reject`

**Mobile:**
`Login (ACT-10001 / 9876543210) → OTP (123456) → Home → Start Task → Capture Photo → Location → Timestamp & Comment → Review → Submit → Success → Task shows Completed`

After submitting a task on mobile, switch to the Desktop app's **Submissions** page (or the relevant **Task Detail** page) in the same browser — the new submission appears immediately, in "Pending Review" status, ready to Approve or Reject.

---

## Project structure

```
advertising app/
├── index.html                  Landing page + prototype switcher
├── css/
│   ├── styles.css              Shared design system (tokens, buttons, tables, badges, forms, modals, toasts...)
│   ├── desktop.css             Desktop shell layout (header, sidebar, cards, detail pages)
│   └── mobile.css              Mobile app shell (phone frame, bottom nav, capture wizard, etc.)
├── js/
│   ├── mock-data.js            Seed data: events, activities, tasks, agents, submissions
│   ├── app.js                  Shared state (localStorage), ID generation, computed status/progress, UI helpers
│   ├── desktop.js              Desktop Admin page controllers
│   └── mobile.js               Android Agent page controllers + task execution wizard
└── pages/
    ├── desktop/                16 pages: dashboard, events, event-create, event-detail,
    │                           activities, activity-create, activity-detail, tasks,
    │                           task-create, task-detail, agents, agent-detail,
    │                           submissions, submission-detail, reports, settings
    └── mobile/                 10 pages: login, otp, home, tasks, task-detail, capture,
                                review, success, history, profile
```

---

## Business rules implemented

- One Event → many Activities. One Activity → exactly one Event.
- One Activity → many Agents; one Agent → many Activities.
- One Activity → many Tasks.
- Activity Numbers (`ACT-10001…`) and Task Numbers (`TSK-10001…`) are always auto-generated, never typed by the user.
- Tasks inherit their assigned agents from the parent Activity by default, and can be reassigned.
- An agent only sees Activities/Tasks for the Activity Number they logged into.
- Submitting a task's evidence moves it to "Pending Review"; a desktop reviewer can Approve or Reject (with a required reason) it from there.
- Deleting an Event/Activity/Task cascades to its children (activities/tasks/submissions) with a confirmation dialog first.

## Limitations (by design, for this phase)

This is a UI/UX and workflow wireframe only. It intentionally has **no** real backend, REST API, database, JWT auth, SMS/OTP gateway, GPS/camera hardware access, cloud storage, push notifications, or offline sync — all of that is simulated with mock data and `localStorage` for demonstration purposes, and is scoped for a later development phase.

Use **Settings → Reset Demo Data** in the Desktop app at any time to restore the original seed dataset.
