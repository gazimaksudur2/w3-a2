# Travel API Full stack project

Express API that serves property listing datasets and property images.

## Setup

```bash
npm install
cp .env.example .env   # optional, defaults work out of the box
npm run dev             # starts the server and restarts on file changes
```

Or just run it with:

```bash
npm start
```

Server defaults to `http://localhost:3000`.

---

## Endpoints

### `GET /get-property`

Returns one of the three property datasets. You can also cap how many items come back with `limit`.

| Query param      | Type    | Required | Notes                                      |
|-------------------|---------|----------|---------------------------------------------|
| `most-popular`    | boolean | one of the three | must be exactly `"true"` |
| `highest-price`    | boolean | one of the three | must be exactly `"true"` |
| `lowest-price`     | boolean | one of the three | must be exactly `"true"` |
| `limit`            | integer | optional | positive integer; if you ask for more than exist, you just get all of them |

Exactly **one** of `most-popular` / `highest-price` / `lowest-price` must be `true`.

**Example:**
```
GET /get-property?most-popular=true&limit=4
```

**Response shape** (original dataset structure is kept, `Items` is sliced to `limit`):
```json
{
  "GeoInfo": { "...": "..." },
  "Result": {
    "Count": 10000,
    "ReturnedCount": 4,
    "Items": [ { "ID": "BC-12660331", "...": "..." } ]
  },
  "Sts": { "...": "..." },
  "Success": true
}
```
- `Count` = total items in the source dataset
- `ReturnedCount` = how many items are actually in this response

**Error responses** (`400`):
- No selector flag provided
- More than one selector flag is `true`
- `limit` is not a positive integer (e.g. `limit=-5`, `limit=abc`, `limit=0`)

```json
{ "success": false, "error": "Missing dataset selector. Provide one of: \"most-popular=true\", \"highest-price=true\", \"lowest-price=true\"." }
```

---

### `GET /images`

Returns the 10 property images.

```
GET /images
```
```json
["/images/image1.jpg", "/images/image2.jpg", "..."]
```

Add `?full=true` if you also want the id and alt text:
```
GET /images?full=true
```
```json
[{ "id": 1, "path": "/images/image1.jpg", "alt": "Property image 1" }]
```

The image files themselves are served as static files:
```
GET /images/image1.jpg   -> image/jpeg
```

---

## `src/data/images.json`

This file drives the `/images` endpoint. You can add, remove, or rename images here without touching the rest of the code.

```json
{
  "images": [
    { "id": 1, "path": "/images/image1.jpg", "alt": "Cozy lakeside cabin exterior" },
    { "id": 2, "path": "/images/image2.jpg", "alt": "Modern kitchen with island" }
  ]
}
```

- `id` — just a unique number
- `path` — must start with `/images/` and match a file in `public/images/`
- `alt` — optional description

The file is loaded once when the server starts. Restart (or let `npm run dev` reload) after you edit it.

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
- Stack traces stay on the server in production; the client just gets a generic 500.
