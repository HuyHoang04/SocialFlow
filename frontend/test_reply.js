// Native fetch
async function testReply() {
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hoanghuy@gmail.com', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const brandRes = await fetch('http://localhost:8080/api/brands', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const brands = await brandRes.json();
    const brandId = brands[0].id;

    const inboxRes = await fetch(`http://localhost:8080/api/brands/${brandId}/inbox`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const messages = await inboxRes.json();
    
    // Find a DM to reply to
    const dm = messages.find(m => m.messageType === 'DIRECT_MESSAGE');
    if (!dm) {
        console.log("No DMs found");
        return;
    }

    console.log("Replying to DM:", dm.id);
    const replyRes = await fetch(`http://localhost:8080/api/inbox/${dm.id}/reply`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: "hello from test script" })
    });
    
    console.log("Reply Status:", replyRes.status);
    const err = await replyRes.text();
    console.log("Response body:", err);
}

testReply().catch(console.error);
