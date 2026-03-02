const BLOB = 'https://jsonblob.com/api/jsonBlob/019cace4-dd9d-783f-8b04-2aa74eae247b';
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let key = 'DSX-';
for (let i = 0; i < 3; i++) {
    if (i > 0) key += '-';
    for (let j = 0; j < 4; j++) key += chars[Math.floor(Math.random() * chars.length)];
}

const days = parseInt(process.argv[2] || '7');
const label = process.argv[3] || 'Client';
const now = new Date();
const expires = days === 0 ? null : new Date(now.getTime() + days * 86400000);

const blob = await (await fetch(BLOB, { headers: { Accept: 'application/json' } })).json();
blob.keys.push({
    key, label: `${label} (${days === 0 ? 'Lifetime' : days + 'd'})`,
    createdAt: now.toISOString(),
    expiresAt: expires ? expires.toISOString() : null,
    active: true, deviceFingerprint: null, lastUsedAt: null,
    maxDevices: 1, loginCity: null, loginCountry: null, loginIP: null,
});
const wr = await fetch(BLOB, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(blob),
});
console.log('Status:', wr.status);
console.log('');
console.log('=== KEY CREATED ===');
console.log('Key:    ', key);
console.log('Label:  ', label);
console.log('Expires:', expires ? expires.toLocaleDateString() : 'LIFETIME');
console.log('Total keys:', blob.keys.length);
