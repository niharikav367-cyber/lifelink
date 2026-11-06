const http = require("http");
const { app, server } = require("./server");

async function runTests() {
  const PORT = server.address().port;
  console.log(`Running tests against server on port ${PORT}...`);

  function request(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, text: body });
          }
        });
      });
      req.on("error", reject);
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  try {
    // 1. Health test
    console.log("1. Testing GET /api/health...");
    let res = await request({
      hostname: "localhost",
      port: PORT,
      path: "/api/health",
      method: "GET"
    });
    console.log("Health response:", res.status, res.data.service);
    if (res.status !== 200 || !res.data.ok) throw new Error("Health check failed");

    // 2. GET /api/requests
    console.log("2. Testing GET /api/requests...");
    res = await request({
      hostname: "localhost",
      port: PORT,
      path: "/api/requests",
      method: "GET"
    });
    console.log("Requests count:", res.data.requests.length);
    if (res.status !== 200 || !Array.isArray(res.data.requests)) throw new Error("GET /api/requests failed");

    // 3. POST /api/requests (submit information)
    console.log("3. Testing POST /api/requests...");
    const samplePayload = {
      blood_group: "O+",
      units: 2,
      hospital: "Care Hospital",
      area: "Banjara Hills, Hyderabad",
      urgency: "Urgent",
      contact: "+91 99887 76655",
      notes: "Testing full stack submission without errors."
    };
    res = await request(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/requests",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      samplePayload
    );
    console.log("POST request status:", res.status, "Created ID:", res.data.request?.id);
    if (res.status !== 201 || !res.data.request?.id) throw new Error("POST /api/requests failed");

    const createdId = res.data.request.id;

    // 4. PATCH /api/requests/:id
    console.log("4. Testing PATCH /api/requests/:id...");
    res = await request(
      {
        hostname: "localhost",
        port: PORT,
        path: `/api/requests/${createdId}`,
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      },
      { status: "Blood Bank Confirmed" }
    );
    console.log("PATCH request status:", res.status, "New status:", res.data.request?.status);
    if (res.status !== 200 || res.data.request?.status !== "Blood Bank Confirmed") {
      throw new Error("PATCH /api/requests failed");
    }

    // 5. GET /api/donors
    console.log("5. Testing GET /api/donors...");
    res = await request({
      hostname: "localhost",
      port: PORT,
      path: "/api/donors",
      method: "GET"
    });
    console.log("Donors count:", res.data.donors.length);
    if (res.status !== 200) throw new Error("GET /api/donors failed");

    // 6. POST /api/donors
    console.log("6. Testing POST /api/donors...");
    res = await request(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/donors",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Niharika V",
        blood_group: "O+",
        city: "Hyderabad",
        area: "Uppal",
        contact: "+91 91234 56789"
      }
    );
    console.log("Donor registration status:", res.status, "Donor:", res.data.donor?.name);
    if (res.status !== 201) throw new Error("POST /api/donors failed");

    // 7. GET /api/centres
    console.log("7. Testing GET /api/centres...");
    res = await request({
      hostname: "localhost",
      port: PORT,
      path: "/api/centres",
      method: "GET"
    });
    console.log("Centres count:", res.data.centres.length);
    if (res.status !== 200) throw new Error("GET /api/centres failed");

    console.log("\nALL API ENDPOINTS TESTED AND PASSED WITHOUT ERRORS!");
  } catch (err) {
    console.error("Test failed:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
