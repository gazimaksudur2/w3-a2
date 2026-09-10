import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeImageEntries } from "./normalizeImage.js";

test("drops entries without a path and fills missing alt text", () => {
  const images = normalizeImageEntries([
    null,
    "/images/image1.jpg",
    { id: 2, path: "  /images/image2.jpg  " },
    { path: "", alt: "empty" },
    { alt: "no path" },
    "   ",
  ]);

  assert.deepEqual(images, [
    { id: 1, path: "/images/image1.jpg", alt: "Golf course image 1" },
    { id: 2, path: "/images/image2.jpg", alt: "Golf course image 2" },
  ]);
});
