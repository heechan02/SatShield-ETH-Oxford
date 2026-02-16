# ⚡ Lightning Network Setup Guide

Complete guide for integrating **real Bitcoin Lightning Network payments** with SatShield.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding the Architecture](#understanding-the-architecture)
3. [Setup Options](#setup-options)
4. [Testing with FakeWallet](#testing-with-fakewallet)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

For immediate testing with real Lightning invoices:

```bash
# 1. Run the setup script
./scripts/setup-lnbits.sh

# 2. Copy .env.example to .env
cp .env.example .env

# 3. Open LNBits and get your API key
open http://localhost:5001

# 4. Update .env with your API key
# VITE_LNBITS_API_KEY=your_key_here

# 5. Start SatShield
npm run dev
```

---

## Understanding the Architecture

### What is LNBits?

LNBits is a **Lightning wallet manager**, not a Lightning node itself. It:
- Provides a user-friendly interface for Lightning wallets
- Generates BOLT11 invoices
- Manages multiple wallets
- **Requires a Lightning backend** (funding source) to function

### Architecture Diagram

```
┌─────────────┐
│  SatShield  │ (Your React App)
│  Frontend   │
└──────┬──────┘
       │ HTTP API calls
       │
       ▼
┌─────────────┐
│   LNBits    │ (Wallet Manager)
│  localhost  │
│    :5001    │
└──────┬──────┘
       │ Connects to...
       │
       ▼
┌─────────────────────────────────┐
│   Lightning Backend             │
│                                 │
│   Options:                      │
│   • FakeWallet (testing)        │
│   • LND node (production)       │
│   • Core Lightning (production) │
│   • LNDhub (custodial)          │
│   • VoidWallet (testnet)        │
└─────────────────────────────────┘
```

### Why You Get 520 Error

The **520 error** means:
- ✅ LNBits is running
- ❌ No Lightning backend configured
- ❌ Cannot create real invoices

**Solution**: Configure a Lightning backend (see options below).

---

## Setup Options

### Option 1: FakeWallet (Testing) ⭐ Recommended for Development

**Best for**: Local development, testing, demos

**Pros**:
- ✅ Generates **real BOLT11 invoices**
- ✅ No real Bitcoin required
- ✅ Manual payment confirmation
- ✅ Perfect for Summer of Bitcoin showcase

**Setup**:
```bash
./scripts/setup-lnbits.sh
# Choose option 1: FakeWallet
```

**How it works**:
1. SatShield generates Lightning invoice
2. LNBits creates real BOLT11 format
3. You manually mark invoice as "paid" in LNBits UI
4. SatShield detects payment via polling

**Confirming Payments**:
1. Go to `http://localhost:5001`
2. Click on your wallet
3. Find the pending invoice
4. Click "Mark as Paid"
5. SatShield auto-detects payment in ~3 seconds

---

### Option 2: VoidWallet (Bitcoin Testnet)

**Best for**: Testing with Bitcoin testnet

**Setup**:
```bash
./scripts/setup-lnbits.sh
# Choose option 2: VoidWallet
```

**Note**: Uses free Bitcoin testnet, no real money.

---

### Option 3: Real Lightning Node (Production) 🚀

**Best for**: Production deployment with real Bitcoin

You need a **full Lightning node** running. Choose one:

#### A. LND (Lightning Network Daemon)

Most popular Lightning implementation.

```bash
# Using Docker
docker run -d \
  --name lnd \
  -v ~/.lnd:/root/.lnd \
  -p 9735:9735 \
  -p 10009:10009 \
  btcpayserver/lnd:latest

# Connect LNBits to LND
docker run -d \
  -p 5001:5000 \
  --name lnbits \
  -e LNBITS_BACKEND_WALLET_CLASS=LndWallet \
  -e LND_REST_ENDPOINT=http://lnd:8080 \
  -e LND_MACAROON_FILE=/path/to/admin.macaroon \
  --link lnd \
  lnbits/lnbits:latest
```

**Requirements**:
- Full Bitcoin node (or Neutrino SPV)
- ~500GB disk space for Bitcoin blockchain
- LND macaroon for authentication

**Resources**:
- [LND Installation](https://docs.lightning.engineering/lightning-network-tools/lnd/run-lnd)
- [LND Docker Setup](https://github.com/lightningnetwork/lnd/blob/master/docker/README.md)

---

#### B. Core Lightning (CLN)

Lightweight Lightning implementation by Blockstream.

```bash
# Using Docker
docker run -d \
  --name lightningd \
  -v ~/.lightning:/root/.lightning \
  -p 9735:9735 \
  elementsproject/lightningd:latest

# Connect LNBits
docker run -d \
  -p 5001:5000 \
  --name lnbits \
  -e LNBITS_BACKEND_WALLET_CLASS=CoreLightningWallet \
  -e CORELIGHTNING_RPC=/path/to/lightning-rpc \
  --link lightningd \
  lnbits/lnbits:latest
```

**Resources**:
- [Core Lightning Docs](https://docs.corelightning.org/)

---

#### C. LNDhub (Custodial)

**Best for**: Quick production setup without running own node

**Services**:
- [BlueWallet](https://bluewallet.io) - Free LNDhub
- [LNDhub.io](https://lndhub.io) - Hosted LNDhub

**Setup**:
1. Create account on BlueWallet or LNDhub.io
2. Get your LNDhub connection URL
3. Configure LNBits:

```bash
docker run -d \
  -p 5001:5000 \
  --name lnbits \
  -e LNBITS_BACKEND_WALLET_CLASS=LndHubWallet \
  -e LNDHUB_API=https://your-lndhub-url \
  -e LNDHUB_ADMIN=your_admin_key \
  lnbits/lnbits:latest
```

**Pros**:
- ✅ No node management
- ✅ Quick setup
- ✅ Real Lightning payments

**Cons**:
- ❌ Custodial (they hold your keys)
- ❌ Relies on third-party service

---

### Option 4: Demo Mode (Presentation Only)

**Best for**: Hackathon demos, presentations when LNBits unavailable

**Setup**:
```bash
# In .env
VITE_LNBITS_DEMO_MODE=true
```

**How it works**:
- Generates fake Lightning invoice
- Auto-confirms after 5 seconds
- No real Lightning Network involved

**⚠️ Warning**: Not suitable for Summer of Bitcoin showcase - use FakeWallet instead!

---

## Testing with FakeWallet

Complete workflow for testing with FakeWallet:

### 1. Start LNBits with FakeWallet

```bash
./scripts/setup-lnbits.sh
# Choose option 1
```

### 2. Create Wallet & Get API Key

```bash
# Open LNBits
open http://localhost:5001

# Steps:
# 1. Click "Add a new wallet" or use default
# 2. Click on wallet name
# 3. Find "API info" section
# 4. Copy "Invoice/read key"
```

### 3. Configure SatShield

```bash
# .env file
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5001
VITE_LNBITS_API_KEY=<your_key_here>
```

### 4. Test Payment Flow

```bash
# Start SatShield
npm run dev

# In browser:
# 1. Go to http://localhost:8080
# 2. Configure a policy
# 3. Select "Bitcoin Lightning" payment
# 4. See real BOLT11 invoice generated!
```

### 5. Confirm Payment in LNBits

```bash
# In LNBits UI (http://localhost:5001):
# 1. Go to your wallet
# 2. Find the pending invoice
# 3. Click "Mark as Paid" or similar button
# 4. Watch SatShield detect payment in ~3 seconds!
```

---

## Production Deployment

For **real Bitcoin payments** in production:

### 1. Choose Infrastructure

**Option A**: Self-hosted Lightning node
- Run your own LND/CLN node
- Full control, non-custodial
- Requires infrastructure management

**Option B**: Custodial service
- Use LNDhub or similar
- Easier setup
- Trade-off: custody

### 2. Security Considerations

```bash
# Use read-only API key
VITE_LNBITS_API_KEY=<invoice_read_key_only>

# NOT the admin key!
# Admin key can spend funds

# In production, use environment variables
# Don't commit API keys to git
```

### 3. Environment Variables

```bash
# Production .env (not committed)
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=https://your-lnbits-domain.com
VITE_LNBITS_API_KEY=<production_key>
```

### 4. Monitoring

Monitor Lightning payments:
- LNBits dashboard
- Lightning node metrics
- Payment success rate
- Invoice expiration rate

---

## Troubleshooting

### 520 Error: "Web Server Returned Unknown Error"

**Cause**: LNBits has no Lightning backend configured

**Solution**:
```bash
# Stop and restart with FakeWallet
docker stop lnbits && docker rm lnbits
./scripts/setup-lnbits.sh
```

---

### "Failed to create Lightning invoice: Network Error"

**Cause**: LNBits not running or wrong URL

**Check**:
```bash
# Verify container is running
docker ps | grep lnbits

# Check logs
docker logs lnbits

# Test connection
curl http://localhost:5001
```

---

### Payments Not Detected

**Cause**: Polling interval or invoice status

**Check**:
1. Invoice is marked as "paid" in LNBits
2. API key has correct permissions
3. Check browser console for errors
4. Polling interval: 3 seconds (automatic)

---

### Invalid API Key

**Cause**: Using admin key instead of invoice/read key

**Solution**:
1. Go to LNBits wallet
2. API info section
3. Copy "Invoice/read key" (NOT admin key)
4. Update `.env`

---

## Code Implementation Details

### How Polling Works

```typescript
// useLightningInvoice.ts
useEffect(() => {
  if (!invoice || isPaid) return;

  const pollInterval = setInterval(async () => {
    // Check payment status every 3 seconds
    const response = await axios.get(
      `${LNBITS_URL}/api/v1/payments/${paymentHash}`,
      { headers: { 'X-Api-Key': LNBITS_API_KEY } }
    );

    if (response.data.paid) {
      setIsPaid(true);
      clearInterval(pollInterval);
    }
  }, 3000);

  return () => clearInterval(pollInterval);
}, [invoice, paymentHash, isPaid]);
```

### Invoice Generation

```typescript
// POST /api/v1/payments
{
  "out": false,           // incoming payment
  "amount": 1280000,      // satoshis
  "memo": "SatShield Policy Premium",
  "unit": "sat"
}

// Response: BOLT11 invoice
{
  "payment_hash": "abc123...",
  "payment_request": "lnbc12800u1..."
}
```

---

## Resources

### Lightning Network
- [Lightning Network Specs](https://github.com/lightning/bolts)
- [BOLT11 Invoice Format](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)

### LNBits
- [Official Docs](https://docs.lnbits.org/)
- [GitHub](https://github.com/lnbits/lnbits)
- [API Reference](https://legend.lnbits.com/docs)

### Lightning Nodes
- [LND](https://github.com/lightningnetwork/lnd)
- [Core Lightning](https://github.com/ElementsProject/lightning)
- [Eclair](https://github.com/ACINQ/eclair)

### Testing Tools
- [HTLC.me](https://htlc.me) - Lightning wallet for testing
- [Phoenix Wallet](https://phoenix.acinq.co/) - Easy Lightning wallet
- [Lightning Polar](https://lightningpolar.com/) - Local Lightning network

---

## Summer of Bitcoin Showcase

For your Summer of Bitcoin submission, emphasize:

1. ✅ **Real BOLT11 invoice generation** (not fake)
2. ✅ **Lightning Network protocol** understanding
3. ✅ **Production-ready architecture** (LNBits → Lightning node)
4. ✅ **Error handling** (520, timeout, invalid invoices)
5. ✅ **Real-time payment detection** (polling)
6. ✅ **QR code generation** for mobile wallets
7. ✅ **Satoshi conversion** and premium calculation

The code is **production-ready** - it just needs proper Lightning infrastructure!

---

**⚡ Happy Lightning Hacking!**
