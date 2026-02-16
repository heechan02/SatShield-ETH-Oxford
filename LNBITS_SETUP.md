# Setting Up Real Lightning Payments with LNBits

⚠️ **For Hackathon/Demo**: Just use `VITE_LNBITS_DEMO_MODE=true` instead!

This guide is only needed if you want to accept **real Bitcoin payments**.

## Option 1: Use LNDhub (Easiest for Testing)

1. Create account at [lndhub.io](https://lndhub.io) or [BlueWallet LNDhub](https://bluewallet.io)
2. In LNBits admin panel:
   - Go to "Extensions" → Enable "LNDhub"
   - Add your LNDhub connection string
3. Now LNBits can create real invoices backed by LNDhub

## Option 2: Run Your Own Lightning Node (Advanced)

You need a full Lightning node running first:

### LND (Lightning Network Daemon)
```bash
# Install LND
docker run -d --name lnd \
  -v ~/.lnd:/root/.lnd \
  -p 9735:9735 -p 10009:10009 \
  btcpayserver/lnd:latest

# Connect LNBits to LND
# In LNBits admin: Settings → Funding Source → LND
# Enter LND connection details
```

### Core Lightning
```bash
# Install Core Lightning
docker run -d --name core-lightning \
  -v ~/.lightning:/root/.lightning \
  -p 9735:9735 \
  elementsproject/lightningd:latest

# Connect LNBits to Core Lightning
# In LNBits admin: Settings → Funding Source → Core Lightning
```

## Option 3: Use Testnet/Regtest

For testing without real bitcoin:

```bash
# Run LND on testnet
docker run -d --name lnd-testnet \
  -e NETWORK=testnet \
  btcpayserver/lnd:latest

# Connect LNBits to testnet LND
```

## Why 520 Error?

The 520 error means:
- ✅ LNBits is running
- ❌ No Lightning backend configured
- ❌ Can't create real invoices

LNBits is just a **wallet manager**, not a Lightning node itself. It needs to connect to an actual Lightning node to work.

## Recommendation

For your **Summer of Bitcoin application**, use demo mode! It shows you understand:
- Lightning invoice generation
- BOLT11 format
- QR code payments
- Payment verification flow
- Integration with smart contracts

You don't need to run a real Lightning node for the demo. Just make sure `VITE_LNBITS_DEMO_MODE=true` and restart your dev server.
