# Wisconsin Workways

Premium civic-tech platform for Wisconsin jobs, live economic data, and transit-accessible opportunity.

## Live data sources

| Domain | Source | Auth |
|--------|--------|------|
| **Economy** | BLS LAUS, CES, QCEW | Optional `BLS_REGISTRATION_KEY` |
| **County unemployment** | Wisconsin DWD WisConomy (all 72 counties) | None |
| **Income / population** | Census ACS 5-Year | `CENSUS_API_KEY` |
| **Labor force** | FRED | `FRED_API_KEY` |
| **Transit** | MCTS & Madison Metro GTFS static | None |
| **Service alerts** | Madison Metro GTFS-Realtime | None |
| **Jobs** | USAJobs, Adzuna | `USAJOBS_AUTH_KEY`, Adzuna keys |

## Run locally

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Economy and transit work **without API keys**. Add keys to `.env` for Census enrichment, FRED labor-force data, and live job listings.

### Recommended free API keys

1. **BLS** — https://data.bls.gov/registrationEngine/
2. **Census** — https://api.census.gov/data/key_signup.html
3. **FRED** — https://fredaccount.stlouisfed.org/apikeys
4. **USAJobs** — https://developer.usajobs.gov/apirequest/
5. **Adzuna** — https://developer.adzuna.com/signup

## Architecture

```
Client pages (SWR) → /api/economy | /api/jobs | /api/transit
  → src/services/live/* → src/services/clients/* → External APIs
```

- Server-side caching with TTL (`src/lib/cache.ts`)
- Commute estimates from GTFS stop proximity
- Provenance metadata on every API response

## Pages

- `/` — Live statewide dashboard
- `/explore` — BLS trends, QCEW industry treemap, county comparison
- `/jobs` — Live jobs + GTFS commute enrichment
- `/transit` — GTFS stop inventory, Madison RT alerts

## Disclaimer

Commute times are estimates from scheduled GTFS data. Not an official Wisconsin state service.
