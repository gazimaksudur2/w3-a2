export function getMapsConfig(_req, res) {
  res.status(200).json({
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  });
}
