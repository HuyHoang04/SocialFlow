// Native fetch

async function testSync() {
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hoanghuy@gmail.com', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Token acquired.");

    const brandRes = await fetch('http://localhost:8080/api/brands', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const brands = await brandRes.json();
    const brandId = brands[0].id;
    console.log("Brand ID:", brandId);

    console.log("Syncing...");
    const syncRes = await fetch(`http://localhost:8080/api/brands/${brandId}/inbox/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log("Sync Status:", syncRes.status);
    if (!syncRes.ok) {
        const err = await syncRes.text();
        console.log("Error body:", err);
    } else {
        console.log("Sync succeeded.");
    }
}

testSync().catch(console.error);
