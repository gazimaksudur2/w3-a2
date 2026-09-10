import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePropertyItem, normalizePropertyItems } from "./normalizeProperty.js";

test("drops non-objects, nulls, and items without an ID", () => {
  assert.equal(normalizePropertyItem(null), null);
  assert.equal(normalizePropertyItem("BC-1"), null);
  assert.equal(normalizePropertyItem({ Property: { PropertyName: "Cabin" } }), null);
  assert.deepEqual(normalizePropertyItems([null, { ID: "" }, { ID: "  " }, 4]), []);
});

test("keeps a usable ID when the rest of the record is missing", () => {
  const item = normalizePropertyItem({ ID: " BC-99 " });

  assert.equal(item.ID, "BC-99");
  assert.equal(item.Property.PropertyName, "");
  assert.equal(item.Property.Price, null);
  assert.equal(item.Property.ReviewScore, null);
  assert.deepEqual(item.Property.TopAmenities, []);
  assert.equal(item.Property.Counts.Bedroom, null);
  assert.equal(item.GeoInfo.Lat, null);
  assert.equal(item.GeoInfo.Lng, null);
  assert.equal(item.Partner.URL, "");
});

test("strips invalid amenities, coordinates, and non-http partner URLs", () => {
  const item = normalizePropertyItem({
    ID: "BC-1",
    GeoInfo: {
      City: " Sanger ",
      Lat: "not-a-coord",
      Lng: "-119.46",
      Categories: [null, { Type: "state", Name: "California" }, { Type: "city" }],
    },
    Property: {
      PropertyName: "Kings River",
      Price: "95",
      TopAmenities: [null, { Name: "  Pool  " }, { ID: "20" }],
      Counts: { Bedroom: "4", Occupancy: 8 },
    },
    Partner: { URL: "javascript:alert(1)", CacheURL: "https://booking.example/stay" },
  });

  assert.equal(item.GeoInfo.City, "Sanger");
  assert.equal(item.GeoInfo.Lat, null);
  assert.equal(item.GeoInfo.Lng, "-119.46");
  assert.deepEqual(
    item.GeoInfo.Categories.map((category) => category.Name),
    ["California"]
  );
  assert.equal(item.Property.Price, 95);
  assert.deepEqual(item.Property.TopAmenities, [{ Name: "Pool" }]);
  assert.equal(item.Property.Counts.Bedroom, 4);
  assert.equal(item.Partner.URL, "https://booking.example/stay");
});

test("preserves a complete record's identity and display name", () => {
  const item = normalizePropertyItem({
    ID: "BC-12660331",
    GeoInfo: { City: "Sanger", Lat: "36.74", Lng: "-119.46" },
    Property: { PropertyName: "Kings River Reflections", Price: 95 },
    Partner: { URL: "https://www.booking.com/hotel/us/example.html" },
  });

  assert.equal(item.ID, "BC-12660331");
  assert.equal(item.Property.PropertyName, "Kings River Reflections");
  assert.equal(item.Property.Price, 95);
  assert.match(item.Partner.URL, /^https:\/\/www\.booking\.com\//);
});
