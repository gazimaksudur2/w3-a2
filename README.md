# Stay&Play (Travel API)

Full-stack Stay&Play listing page: an Express API in `scripts/` serves property datasets and gallery images, and the root UI (`index.html` + `ui-scripts/`) consumes those endpoints.

Do not open `index.html` as a file. The UI talks to the API with relative URLs (`/get-property`, `/images`), so the Express server must be running.

---

## Prerequisites

- **Git**
- **Node.js 18+** (Node 20 or 22 recommended). Check with `node -v`
- **npm** (bundled with Node)
- A **Google Maps JavaScript API** key (optional for the rest of the app; required for the nearby-stay map)

---

## Clone and run

```bash
git clone https://github.com/gazimaksudur2/w3-a2.git
cd w3-a2
```

Install dependencies from `scripts/` (that is where `package.json` lives):

```bash
cd scripts
npm install
```

Create an env file. The server reads **repo root** `.env` first, then `scripts/.env`, and never overwrites a variable that is already set.

```bash
# from the repo root
cp .env.example .env
```

Or from `scripts/`:

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
GOOGLE_MAPS_API_KEY=your_key_here
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `GOOGLE_MAPS_API_KEY` | for the map | empty | Injected into `ui-scripts/property-map.js` when that file is served. There is no `/maps-config` route |

Never commit `.env`. It is gitignored.

Start the API (still inside `scripts/`):

```bash
npm run dev    # node --watch, restarts on server file changes
# or
npm start      # node src/index.js
```

You should see:

```
Server running on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

Graceful shutdown is wired for `SIGINT` and `SIGTERM`.

### Maps key (nearby-stay map)

1. Enable **Maps JavaScript API** on the Google Cloud project for this key.
2. Restrict the key by HTTP referrer to `http://localhost:3000/*` (and your deployed origin when you have one).
3. Restart the server after changing `.env`. The key is substituted into `ui-scripts/property-map.js` at request time (`__GOOGLE_MAPS_API_KEY__` → the env value). The raw file on disk still contains the placeholder.

The rest of the UI (gallery, properties, favorites, booking) works without a key. The map canvas shows a short fallback message if the key is missing.

### Quick health check

```bash
curl -s http://localhost:3000/health
# {"success":true,"status":"ok"}

curl -s "http://localhost:3000/get-property?most-popular=true&limit=1"
curl -s "http://localhost:3000/images?full=true"
```

---

## Server (`scripts/`)

Express 5 app (`type: "module"`). On boot it loads the three property JSON datasets and `images.json` into memory. A corrupt data file fails at startup, not on the first request.

Layout:

```
scripts/
  src/
    index.js                 process entry: env, cache warm, listen, shutdown
    app.js                   Express app: helmet, cors, morgan, routes, static, inject map key
    controllers/
      property.controller.js GET /get-property
      images.controller.js   GET /images
    services/
      property.service.js    most-popular / highest-price / lowest-price datasets
      images.service.js      images.json
    routes/
      property.routes.js
      images.routes.js
    middlewares/
      errorHandler.js
      notFound.js
    utils/
      ApiError.js
      loadEnv.js
      loadJson.js
      queryParsers.js
    data/
      most_popular.json
      highest_price.json
      lowest_price.json
      images.json
  public/images/             static files for GET /images/imageN.jpg
  package.json
```

API routes are registered **before** `express.static`, so `GET /images` is the JSON handler and `GET /images/image1.jpg` is the file.

### `GET /health`

```json
{ "success": true, "status": "ok" }
```

### `GET /get-property`

Exactly **one** of `most-popular`, `highest-price`, `lowest-price` must be the string `"true"`. `limit` is an optional positive integer; if you ask for more than exist, you get all of them.

| Query | Type | Required | Notes |
|---|---|---|---|
| `most-popular` | boolean | one of the three | must be exactly `"true"` |
| `highest-price` | boolean | one of the three | must be exactly `"true"` |
| `lowest-price` | boolean | one of the three | must be exactly `"true"` |
| `limit` | integer | optional | positive integer |

```
GET /get-property?most-popular=true&limit=4
```

Response keeps the original dataset shape; `Result.Items` is sliced to `limit`. `Count` is the full dataset size; `ReturnedCount` is how many items are in this response.

**400** when no selector is set, more than one selector is `true`, or `limit` is not a positive integer:

```json
{ "success": false, "error": "Missing dataset selector. Provide one of: \"most-popular=true\", \"highest-price=true\", \"lowest-price=true\"." }
```

### `GET /images`

```
GET /images
```

```json
["/images/image1.jpg", "/images/image2.jpg"]
```

```
GET /images?full=true
```

```json
[{ "id": 1, "path": "/images/image1.jpg", "alt": "Wide Golf Club 1" }]
```

Image files:

```
GET /images/image1.jpg
```

The nearby-stay map does **not** use a config endpoint. `GOOGLE_MAPS_API_KEY` from `.env` is injected into `ui-scripts/property-map.js` when that file is served.

`index.js` also:

- Persists favorite property IDs in `localStorage` under `stayplay.favoritePropertyIds` (same list on desktop and mobile).
- Syncs the map via `window.syncNearbyStayMap(visibleItems)` after each grid render.
- Clones the course title and booking card into the desktop gallery modal on first open; date and price fields stay in sync through shared classes (`js-display-checkin`, `js-price-per-night`, …).

Property images on cards use `https://beta.imgservice.rentbyowner.com/640x300/` plus `Property.FeatureImage`. Gallery photos use `/images/imageN.jpg` from this API.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| `Cannot find module` / empty page on port 3000 | Run `npm install` inside `scripts/`, then `npm start` from there |
| `EADDRINUSE` | Another process holds `PORT`. Change `PORT` in `.env` or stop the other process |
| Properties or gallery stay empty | Confirm the server log shows it started, then hit `/health` and `/get-property?most-popular=true&limit=1` |
| Map shows the fallback message | `GOOGLE_MAPS_API_KEY` in `.env`, Maps JavaScript API enabled, server restarted, referrer allows `http://localhost:3000/*` |
| Opening `index.html` directly fails | Use `http://localhost:3000` so fetches go to Express |

---

## Project structure

```
src/
  app.js                    Express setup
  index.js                  starts the server
  controllers/
    property.controller.js  GET /get-property
    images.controller.js    GET /images
  services/
    property.service.js     loads the 3 property datasets
    images.service.js       loads images.json
  routes/
    property.routes.js
    images.routes.js
  middlewares/
    errorHandler.js
    notFound.js
  utils/
    ApiError.js
    loadEnv.js
    loadJson.js
    queryParsers.js
  data/
    most_popular.json
    highest_price.json
    lowest_price.json
    images.json
public/
  images/
    image1.jpg ... image10.jpg
```

## Notes

- Datasets are loaded into memory on startup, so a bad json file fails immediately instead of on the first request.
- Query flags only accept the string `"true"`. `limit` has to be a positive integer. Anything else is a 400.
- If `limit` is bigger than the dataset, it just returns everything.
- API routes are registered before `express.static` so `/images` doesn't collide with the `public/images` folder.
- `GOOGLE_MAPS_API_KEY` is injected into `ui-scripts/property-map.js` when the server serves that file. There is no `/maps-config` route.
- Stack traces stay on the server in production; the client just gets a generic 500.
