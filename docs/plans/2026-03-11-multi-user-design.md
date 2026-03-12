# Multi-User Architecture Design

**Date:** 2026-03-11
**Status:** Approved (pending implementation)
**Author:** Guilherme + Claude

---

## 1. High-Level Architecture

### Stack

| Layer | Current | New |
|-------|---------|-----|
| Auth | None | Firebase Auth (Google + email/password) |
| Database (user data) | SQLite local | Firestore subcollections |
| Database (market data) | SQLite + static JSON | Static JSON on Firebase Hosting (unchanged) |
| Hosting | GitHub Pages | Firebase Hosting |
| Map renderer | Leaflet + JSON markers | MapLibre GL JS + PMTiles |
| Scheduled jobs | None | Cloud Function (daily indicator update) |
| Backend API | FastAPI (Python) | Removed — frontend talks directly to Firestore |

### Key Decisions

- **No Cloud Run/backend**: The demo mode already proved that all calculations run client-side. Firestore + Security Rules replaces the API layer entirely.
- **Static market data stays static**: ITBI transactions, indicators, and bairro stats are updated infrequently. No need to move them to Firestore — serve as static files from Firebase Hosting.
- **Cloud Function only for indicator updates**: A single scheduled function fetches BCB/IBGE data daily and writes updated `indicators.json` to Hosting.

---

## 2. Firebase Auth

### Providers

- Google Sign-In (primary — frictionless)
- Email/password (fallback — requires email verification)

### Rules

- `request.auth != null` on all user data reads/writes
- `request.auth.token.email_verified == true` required for write operations
- No anonymous auth — users must be identified

### Frontend Integration

```
AuthContext (React Context)
├── useAuth() hook → { user, loading, signIn, signOut }
├── ProtectedRoute wrapper
├── Login page (Google button + email/password form)
└── Email verification gate (blocks writes until verified)
```

---

## 3. Firestore Data Model

### Structure: Subcollections (physically isolated per user)

```
/users/{uid}
├── /imoveis/{id}
│   ├── endereco: { rua, numero, bairro, cidade, estado, cep }
│   ├── compra: { valorCompra, dataCompra, custosAdicionais }
│   ├── areaUtil: number
│   ├── aluguelMensal: number | null
│   ├── deleted: boolean (soft delete)
│   ├── deletedAt: timestamp | null
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
├── /alerts/{id}
│   ├── bairro: string
│   ├── tipo: "preco" | "volume" | "tendencia"
│   ├── threshold: number
│   ├── active: boolean
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
└── profile (document, not subcollection)
    ├── displayName: string
    ├── email: string
    └── createdAt: timestamp
```

### Why Subcollections Over Flat Collections

Evaluated during Red Team analysis. Flat collections (`/imoveis/{id}` with `userId` field) rely on query-level security rules — a single missing `where` clause or rule error exposes all users' data. Subcollections (`/users/{uid}/imoveis/{id}`) provide **physical isolation**: even a misconfigured query can only access the authenticated user's subtree.

Trade-off: Cross-user analytics (admin dashboards) require collection group queries. Acceptable — no admin features planned.

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      // Imoveis subcollection
      match /imoveis/{imovelId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow create: if request.auth != null
                      && request.auth.uid == uid
                      && request.auth.token.email_verified == true
                      && validateImovel(request.resource.data);
        allow update: if request.auth != null
                      && request.auth.uid == uid
                      && request.auth.token.email_verified == true;
        allow delete: if false; // Use soft delete only
      }

      // Alerts subcollection
      match /alerts/{alertId} {
        allow read, write: if request.auth != null
                          && request.auth.uid == uid
                          && request.auth.token.email_verified == true;
      }
    }

    // Schema validation function
    function validateImovel(data) {
      return data.keys().hasAll(['endereco', 'compra', 'areaUtil', 'createdAt'])
        && data.areaUtil is number
        && data.areaUtil > 0
        && data.compra.valorCompra is number
        && data.compra.valorCompra > 0;
    }
  }
}
```

### Security Hardening (from Red Team analysis)

| Defense | Implementation |
|---------|---------------|
| Physical isolation | Subcollections under `/users/{uid}/` |
| Schema validation | `validateImovel()` in Security Rules |
| Rate limiting | Firebase App Check + per-IP rate limits |
| Email verification | `email_verified == true` for writes |
| Soft delete | `deleted: true` flag, no physical deletes |

---

## 4. Map Migration: MapLibre GL JS + PMTiles

### Why Replace Leaflet

| Aspect | Leaflet (current) | MapLibre GL JS |
|--------|-------------------|----------------|
| Rendering | CPU (DOM-based markers) | GPU (WebGL) |
| 10K+ points | Laggy, browser-heavy | Smooth, native clustering |
| Styling | CSS-based, limited | Data-driven GL styles |
| Vector tiles | Plugin-based, slow | Native support |
| Mobile | Acceptable | Significantly better |

### PMTiles Pipeline

```
SQLite (ITBI data)
  → python script → GeoJSON
    → tippecanoe CLI → .pmtiles file
      → Firebase Hosting (served via HTTP range requests)
```

**tippecanoe flags:**
```bash
tippecanoe \
  --output=itbi_transactions.pmtiles \
  --layer=transactions \
  --minimum-zoom=10 \
  --maximum-zoom=14 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --force
```

### Progressive Loading Strategy

```
Page Load
├── 1. itbi_stats.json (172KB) → instant neighborhood bubbles
├── 2. bairro_centers.json (2.7KB) → position bubbles
├── 3. PMTiles header (HTTP range request) → tile index
└── 4. PMTiles tiles (on-demand) → individual transactions at high zoom
```

User sees neighborhood-level data within 200ms. Individual transaction dots stream in as they pan/zoom.

### Component Changes

| Current | New |
|---------|-----|
| `<MapContainer>` (react-leaflet) | `<Map>` (react-map-gl + MapLibre) |
| `<ClusterLayer>` (custom + supercluster) | MapLibre native `cluster` source |
| `<CircleMarker>` (Leaflet) | MapLibre `circle` layer with data-driven styling |
| `<MapViewportTracker>` | `onMoveEnd` callback on Map component |
| supercluster (JS) | MapLibre built-in clustering (runs on GPU) |

### Dependencies

```json
{
  "maplibre-gl": "^4.x",
  "react-map-gl": "^7.x",
  "pmtiles": "^3.x"
}
```

Remove: `leaflet`, `react-leaflet`, `@types/leaflet`, `supercluster`, `@types/supercluster`

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| tippecanoe Linux-only | GitHub Action pipeline (no local dependency) |
| WebGL not available | `maplibregl.supported()` check + table fallback |
| PMTiles too large | tippecanoe density flags + range requests (only visible tiles load) |
| Cache stale after update | Hash in filename (`itbi_v{hash}.pmtiles`) |
| Regression during migration | Feature flag + keep Leaflet until MapLibre validated |

---

## 5. Phased Implementation Plan

### Phase 1 — Auth + Firestore (foundation)

```
├── Firebase project setup (Auth, Firestore, Hosting)
├── Security Rules with schema validation
├── AuthContext + login/signup UI
├── Migrate property data to Firestore subcollections
├── Migrate alerts to Firestore subcollections
├── Deploy to Firebase Hosting (replace GitHub Pages)
└── Most critical phase — entire data layer changes
```

### Phase 2 — Map: MapLibre + PMTiles (performance)

```
├── GitHub Action: SQLite → GeoJSON → tippecanoe → .pmtiles
├── MapLibre GL JS replacing Leaflet
├── Feature flag for Leaflet rollback
├── Native clustering via MapLibre sources
├── Progressive loading (stats JSON → PMTiles streaming)
├── WebGL detection + fallback
└── Highest technical complexity
```

### Phase 3 — Polish + Monitoring

```
├── Cloud Function for daily indicator updates
├── App Check for rate limiting
├── Soft delete UI (property recycle bin)
├── Optimized Firestore indexes
├── Firebase Performance monitoring
└── Refinement, no structural changes
```

### Phase Dependencies

- Phase 1 is prerequisite for everything (auth gate)
- Phase 2 is independent of Phase 1 code-wise, but needs Firebase Hosting for PMTiles
- Phase 3 can start in parallel with Phase 2

### Go/No-Go Criteria

| Transition | Criteria |
|-----------|----------|
| Phase 1 → 2 | Login functional, CRUD via Firestore working, Security Rules tested, Firebase Hosting deploy OK |
| Phase 2 → 3 | MapLibre has all Leaflet features, PMTiles serving correctly, feature flag removed |

---

## 6. What Stays the Same

- All market data remains static JSON (no migration needed)
- `staticData.ts` calculation logic unchanged
- Chart components (PriceEvolutionChart, etc.) unchanged
- Market Explorer filters and UI unchanged
- Opportunity cost calculator logic unchanged (B22 fix already applied)

---

## 7. Cost Estimate (Firebase Free Tier)

| Service | Free Tier | Expected Usage |
|---------|-----------|---------------|
| Auth | 10K MAU | < 100 users |
| Firestore | 1GB storage, 50K reads/day | < 10MB, < 1K reads/day |
| Hosting | 10GB transfer/month | < 1GB/month |
| Cloud Functions | 2M invocations/month | 30/month (daily cron) |

**Verdict:** Stays within free tier for foreseeable future.
