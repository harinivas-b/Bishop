const https = require("https");

function reverseGeocode(lat, lon) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`;
    const req = https.get(url, { headers: { "User-Agent": "BISHOP-App/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  console.log("=== Testing Dharmapuri Coordinates (12.1211, 78.1582) ===");
  const dharmapuri = await reverseGeocode(12.1211, 78.1582);
  console.log("Display Name:", dharmapuri.display_name);
  console.log("Structured Address:", JSON.stringify(dharmapuri.address, null, 2));

  console.log("\n=== Testing Cuddalore Coordinates (11.7480, 79.7714) ===");
  const cuddalore = await reverseGeocode(11.7480, 79.7714);
  console.log("Display Name:", cuddalore.display_name);
  console.log("Structured Address:", JSON.stringify(cuddalore.address, null, 2));
}

run().catch(console.error);
