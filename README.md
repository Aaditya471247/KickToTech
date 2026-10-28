# JalMitra Smart Farm

Drought-resilient smart farming for small farms: live soil-moisture telemetry along a 10 m crop row with automatic drip-valve control, natural pest and disease remedies, bio-fertilizer recipes with an NPK and soil-carbon calculator, weather and market intelligence, and a crop ledger with a water-savings audit.

**Stack:** React + Vite + Tailwind + Recharts (frontend) · Express + TypeScript + Prisma + PostgreSQL/TimescaleDB + Redis + Socket.io + MQTT (backend) · JWT + bcrypt + RBAC.

## Quick start

Requirements: Node 18+ (20 recommended), Docker.

```bash
npm run install:all          # installs root, backend and frontend dependencies
npm run db:up                # starts TimescaleDB (Postgres) and Redis in Docker
npm run db:setup             # creates tables, turns Telemetry into a hypertable, seeds data
npm run dev                  # API on :4000, web app on :5173
npm run simulate             # in a second terminal: fake sensors feeding the dashboard
```

Open http://localhost:5173 and sign in with **9999999999 / demo1234** (admin: 9000000000 / admin1234).

Watch the demo: the simulated soil dries below 25%, the valve opens by itself, water reaches the 5 m and then the 10 m node, and when the **End (10 m)** sensor passes 65% the valve shuts off automatically (AUTO SHUTOFF appears in the valve activity list).

If `db:setup` reports that the `timescaledb` extension is missing, you are on plain Postgres. The app works without it; just skip `db:timescale`.

## Project layout

```
backend/
  prisma/schema.prisma        full schema (User, Farm, Sensor, Telemetry, CropPortfolio, FarmRecord, NaturalRemedy + ValveEvent, BioFertilizer)
  prisma/seed.ts              remedies, recipes, demo users and a demo crop cycle
  src/config/                 database, redis (cache + pub/sub adapter), mqtt bridge, socket.io, env validation
  src/modules/iot/            iot.service.ts (auto-valve thresholds) + iot.controller.ts
  src/modules/portfolios/     portfolio.service.ts (expense and water-savings audit)
  src/modules/advisory|market|auth|farms/
  src/routes/api.router.ts    complete routing table
  src/app.ts, src/server.ts   Express bootstrap + Socket.io server
  src/simulator.ts            field hardware simulator
frontend/src/pages/           Login, Dashboard, Remedies, SoilHealth, Market, Ledger
```

## API (all under /api/v1, responses are `{ data }` or `{ error }`)

| Method and path | Purpose |
| --- | --- |
| POST /auth/register, /auth/login | Create account (also creates a farm with 3 sensors) / sign in |
| POST /iot/telemetry | Sensor payload, header `x-device-key`. Stores, evaluates valve rules, emits Socket.io |
| GET /iot/sensors/:farmId | Latest reading for the 0 m, 5 m, 10 m nodes and valve state |
| POST /iot/valve/control | `{ farmId, action: OPEN / CLOSE / AUTO }` |
| GET /advisory/remedies, /advisory/fertilizers | Searchable remedies (`?q=&category=`), recipes |
| GET /advisory/calculator?crop=&acres= | NPK and soil-carbon plan |
| GET /market/et-forecast, /market/crop-match, /market/prices | ET forecast, water-wise crops, price analyzer |
| POST /portfolios, POST /portfolios/:id/records | Crop cycles and logbook entries |
| GET /portfolios/:id/audit | Profit totals and water savings |

Extra endpoints used by the UI: `GET /farms`, `GET /iot/history/:farmId`, `GET /iot/events/:farmId`, `GET /portfolios`, `GET /portfolios/:id`, `GET /advisory/crops`, and admin-only `POST /advisory/remedies`.

### Sending real sensor data

HTTP: `POST /api/v1/iot/telemetry` with header `x-device-key: <DEVICE_API_KEY>` and body
`{ "sensorId": "...", "moisture": 31.5, "temperature": 28.2, "batteryLevel": 88, "signalQuality": 80 }`.

MQTT: set `MQTT_URL` in `backend/.env`. Nodes publish to `jalmitra/<farmId>/telemetry`; the server publishes valve commands to `jalmitra/<farmId>/valve/cmd` as `{ "action": "OPEN" | "CLOSE" }`.

## Valve rules (backend/src/modules/iot/iot.service.ts)

* AUTO mode: valve opens when the average moisture of fresh readings is below **25%**.
* In every mode: valve closes when the **End (10 m)** sensor reaches **65%** (field capacity), or after `MAX_VALVE_RUN_MINUTES` as a failsafe.
* Each run's litres (minutes open x `flowRateLpm`) are credited to the farm's active crop cycles for the water audit.

## Things to know

* **Market prices are illustrative sample data** (deterministic, so charts are stable). Replace `priceAnalysis` in `market.service.ts` with Agmarknet / e-NAM calls for live rates. ET forecasts are live from Open-Meteo, with an offline fallback.
* **Remedy and fertilizer doses are standard natural-farming figures** gathered for guidance. Check them with your local KVK or agriculture officer before large-scale use.
* The flood-irrigation baseline in the audit assumes 50% application efficiency; edit `FLOOD_EFFICIENCY` in `portfolio.service.ts`.
* Change `JWT_SECRET` and `DEVICE_API_KEY` in `backend/.env` before deploying.
* Production: `npm --prefix backend run build && npm --prefix backend start`, and `npm --prefix frontend run build` (serve `frontend/dist`; set `VITE_API_URL` if the API is on another domain).
