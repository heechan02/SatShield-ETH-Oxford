# 🧪 Testing Real Lightning Integration

Quick guide to verify your Lightning Network integration works.

---

## Step 1: Setup LNBits

Run the setup script:

```bash
cd /Users/heechan/Desktop/Projects/SatShield-ETH-Oxford
./scripts/setup-lnbits.sh
```

**Choose option 1** (FakeWallet) when prompted.

Expected output:
```
✓ Docker is installed
⚙️  Using FakeWallet (Testing mode)
🐳 Starting LNBits container...
✓ LNBits is running!
```

---

## Step 2: Get Your API Key

1. Open LNBits in browser:
   ```bash
   open http://localhost:5001
   ```

2. You'll see the LNBits dashboard
3. Click on "Wallet" or the wallet name at top
4. Find **"API info"** section
5. Copy the **"Invoice/read key"** (looks like: `1d5f3343da7b4fec9c7d53d0ff28f235`)

**⚠️ Important**: Copy the "Invoice/read key", NOT the "Admin key"!

---

## Step 3: Update Environment

Edit your `.env` file:

```bash
# Open .env in VS Code or nano
nano .env

# Update these lines:
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5001
VITE_LNBITS_API_KEY=<paste_your_key_here>
```

Save and exit (Ctrl+X, then Y, then Enter if using nano).

---

## Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 5: Test Invoice Generation

1. Open SatShield: `http://localhost:8080`
2. Click on any risk pool (Wildfire, Earthquake, etc.)
3. Configure a policy:
   - Select location
   - Set coverage amount (e.g., $50,000)
   - Choose trigger threshold
4. Scroll to **"Select Payment Method"**
5. Click **"Bitcoin Lightning"** tab
6. You should see:
   - ✅ Real BOLT11 invoice generated
   - ✅ QR code displayed
   - ✅ "Waiting for payment..." indicator
   - ✅ NO "Demo Mode" badge (proves it's real!)

---

## Step 6: Confirm Payment

Since you're using FakeWallet, you need to manually confirm:

1. Go back to LNBits: `http://localhost:5001`
2. Click on your wallet
3. You'll see a **pending invoice**
4. Click on the invoice
5. Click **"Mark as Paid"** or similar button
6. Go back to SatShield
7. Within **3 seconds**, you should see:
   - ✅ Green checkmark
   - ✅ "Payment Confirmed!" message
   - ✅ "Mint Policy" button becomes enabled

---

## Step 7: Verify Invoice Details

Check that the invoice contains correct data:

**In SatShield:**
- Premium amount in USD (e.g., $1,250)
- Converted to satoshis (e.g., 1,280,000 sats)
- QR code is scannable

**In LNBits:**
- Invoice amount matches
- Memo contains policy details
- Invoice is properly formatted BOLT11

---

## Expected Results

### ✅ Success Indicators

- [ ] LNBits container running (`docker ps | grep lnbits`)
- [ ] No 520 errors in browser console
- [ ] Real BOLT11 invoice generated (starts with `lnbc`)
- [ ] QR code displays correctly
- [ ] Invoice appears in LNBits dashboard
- [ ] Payment detection works within 3 seconds
- [ ] No "Demo Mode" badge shown

### ❌ Common Issues

**520 Error:**
```
POST http://localhost:5001/api/v1/payments 520
```
**Solution**: LNBits needs restart with FakeWallet
```bash
docker stop lnbits && docker rm lnbits
./scripts/setup-lnbits.sh
```

**Network Error:**
```
Failed to create Lightning invoice: Network Error
```
**Solution**: Check if LNBits is running
```bash
docker ps | grep lnbits
docker logs lnbits
```

**Wrong API Key:**
```
403 Forbidden
```
**Solution**: Use Invoice/read key, not Admin key

---

## Verify Real Lightning Integration

To prove this is **real Lightning**, not demo:

### 1. Check Invoice Format
Real BOLT11 invoice looks like:
```
lnbc1280000n1p3xnhl2pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypq...
```

Demo mode generates:
```
lnbc_demo_1234567890
```

### 2. Check LNBits Dashboard
- Real mode: Invoice appears in LNBits transactions
- Demo mode: Nothing appears in LNBits

### 3. Check Console
Real mode logs:
```
POST http://localhost:5001/api/v1/payments
Response: {payment_hash: "abc123", payment_request: "lnbc..."}
```

Demo mode logs:
```
🎭 DEMO MODE: Simulated Lightning payment
```

### 4. Scan with Real Wallet
- Use Phoenix or HTLC.me wallet
- Scan the QR code
- Real invoice: Wallet recognizes it
- Demo invoice: Wallet rejects it

---

## Next Steps

Once verified:

1. ✅ Commit to Git with `DEMO_MODE=false` in `.env.example`
2. ✅ Push to GitHub for Summer of Bitcoin reviewers
3. ✅ Include LIGHTNING_SETUP.md in your documentation
4. ✅ Mention "Real BOLT11 invoice generation" in your application

---

## Questions?

See [LIGHTNING_SETUP.md](./LIGHTNING_SETUP.md) for:
- Production deployment with real Lightning nodes
- Connecting to LND, Core Lightning, or LNDhub
- Bitcoin mainnet vs testnet
- Security considerations

---

**⚡ You now have real Lightning Network integration!**
