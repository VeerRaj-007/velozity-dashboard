# Velozity Client Project Dashboard

Real-time client project dashboard with role-based access (Admin / PM /
Developer), live task activity feed, and notifications.

## Stack

- **Frontend:** React + TypeScript + Vite, React Router, socket.io-client
- **Backend:** Node.js + Express + TypeScript
- **DB:** PostgreSQL via Prisma
- **Real-time:** Socket.io
- **Background jobs:** node-cron

## Local Setup (Docker: recommended)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run seed
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Seed logins (all `Password123!`): `admin@velozity.test`,
  `pm1@velozity.test`, `pm2@velozity.test`, `dev1@velozity.test` .. `dev4@velozity.test`

## Local Setup (without Docker)

```bash
# Postgres running locally, DATABASE_URL pointed at it
cd backend && cp .env.example .env && npm install
npx prisma migrate dev --name init
npm run seed
npm run dev          # http://localhost:4000

# separate shell
cd frontend && cp .env.example .env && npm install
npm run dev          # http://localhost:5173
```

## Architecture Decisions

**WebSocket library: Socket.io over raw `ws`.** Rooms are the entire
mechanism the role-filtered feed relies on (`global`, `project:<id>`,
`user:<id>`), and Socket.io gives per-connection room membership plus
automatic reconnection/fallback for free. Raw WebSocket would mean
hand-rolling both.

**Job scheduler: node-cron over Bull.** The overdue sweep has no payload,
no retries, no backoff, and nothing to queue it's one periodic `UPDATE ...
WHERE dueDate < now()`. Bull's Redis-backed queue is built for jobs with
per-item state and failure handling; adding it here would be infrastructure
for a job that doesn't need any.

**Token storage: access token in memory (React state/module var), refresh
token in an HttpOnly cookie.** Neither is ever placed in
`localStorage`/`sessionStorage`, so an XSS payload can't read either token
directly. `/api/auth/refresh` is scoped to the `/api/auth` cookie path.

**Real-time role-filtering happens at the socket-room level, not by the
client discarding events.** On connect, a socket is auto-joined to the room
matching its role's scope (`global` for Admin, one `project:<id>` room per
project a PM manages, `user:<id>` for a Developer). The activity service
never targets `io.emit()` broadcast-to-everyone — it emits only to the three
rooms a given task's update could possibly be relevant to. This also means
role access can't be bypassed by a modified client, since the server decides
room membership from the verified JWT, not from anything the client sends
(except the explicit `join_project` event, which is itself access-checked
against the DB before the join is allowed).

## Database Schema

`User (role: ADMIN/PM/DEVELOPER) → Project (client, manager) → Task (project,
assignee, status, priority, dueDate) → TaskActivity (task, user, from/to
status)`, plus `Client` and `Notification`.

Indexes: `Project.managerId` / `Project.clientId` (every PM-scoped query
filters by these), `Task.projectId` / `.assigneeId` / `.status` / `.priority`
/ `.dueDate` (each is an independent, shareable-URL filter — see
`schema.prisma` for the reasoning on why they're separate rather than one
composite), `TaskActivity(taskId, createdAt)` (feed reads are always "latest
N ordered by time," either globally or per task), `Notification(userId,
isRead)` (the bell always asks "unread for this user" first).

## Known Limitations

- No automated test suite given the timeline, testing effort went into
  manually verifying the auth/role boundary and the real-time fan-out
  instead.
- Frontend styling is functional, not polished inline styles, no design
  system. All required screens and interactions are present.
- No password-reset or user-invite flow; users are created only via the seed
  script (an Admin "create user" endpoint would be the next thing to add).
- Presence count is a simple connected-socket count, not deduped across
  browser tabs beyond the per-user connection counter in `sockets/index.ts`.
- **Environment note for reviewers:** `npx prisma generate` needs to reach
  `binaries.prisma.sh` to download its query-engine binary. That domain was
  blocked in the sandbox this was built in, so the Prisma-derived types
  (`Role`, `TaskStatus`, etc.) couldn't be fully typechecked in that
  environment they resolve normally on a machine with standard internet
  access, which is what `docker compose up` assumes.

## Explanation (for the submission form)

The hardest part was making the real-time feed role-filtered without
duplicating that filtering logic in two places. The fix was to push all of
it into socket room membership at connect time an Admin's socket joins a
`global` room, a PM's joins one room per project they manage, a Developer's
joins a personal `user:<id>` room so the activity service just emits each
event to the `project:<id>` and `user:<id>` rooms it's relevant to, plus
`global`, and never has to know who's allowed to see what. Access can't be
gamed from the client because room membership is derived from the verified
JWT server-side, not from anything the socket claims. Missed-event catchup
reads the same `TaskActivity` table the live feed writes to, so a
reconnecting user's "last 20" is never out of sync with what live viewers
saw. If I did it differently, I'd add a `ProjectMember` join table now
rather than later Developers currently get room access by "has a task in
this project," which works for the spec but won't scale cleanly to features
like project-level chat or multiple non-assignee viewers.
