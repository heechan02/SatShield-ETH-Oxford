# ⚡ SatShield - Parametric Insurance on Flare Network

**Top 6 Finalist @ ETH Oxford 2026**

Website: https://sat-shield-eth-oxford-git-feature-bi-3f77f5-heechan02s-projects.vercel.app

Decentralized parametric insurance platform powered by Flare's FTSO oracles and Bitcoin Lightning Network payments.

---

## 🎯 What is SatShield?

SatShield provides **instant, automated insurance payouts** based on real-world data:

- **Wildfire Insurance** - Triggers on temperature/humidity thresholds
- **Earthquake Insurance** - Triggers on seismic magnitude
- **Flood Insurance** - Triggers on rainfall levels
- **Hurricane Insurance** - Triggers on wind speed

**No claims, no paperwork** - when oracle data exceeds your trigger, you get paid automatically.

---

## 🚀 Quick Start

### **1. Install Dependencies**

```bash
npm install
```

### **2. Setup Lightning Network**

```bash
# Run the automated setup script
./scripts/setup-lnbits.sh

# This will:
# - Start LNBits with FakeWallet (testing mode)
# - Generate real BOLT11 Lightning invoices
# - Give you an API key
```

### **3. Configure Environment**

```bash
# Copy .env.example to .env
cp .env.example .env

# Update .env with your LNBits API key from http://localhost:5001
```

### **4. Run SatShield**

```bash
npm run dev
```

Open **http://localhost:8080**

> 💡 **Note**: See [LIGHTNING_SETUP.md](./LIGHTNING_SETUP.md) for production deployment with real Lightning nodes (LND, Core Lightning, LNDhub)

---

## ⚡ Bitcoin Lightning Network Integration

**Real Lightning Network payments** powered by LNBits and BOLT11 protocol.

### **Key Features:**

- ✅ **Production-Ready**: Real BOLT11 invoice generation via LNBits
- ✅ **Multiple Backends**: Supports LND, Core Lightning, LNDhub, FakeWallet
- ✅ **Real-time BTC Price**: Live Bitcoin price from CoinGecko API
- ✅ **QR Code Payments**: Scannable with any Lightning wallet
- ✅ **Payment Detection**: 3-second polling for instant confirmation
- ✅ **Satoshi Conversion**: Automatic premium calculation in sats
- ✅ **3 Payment Methods**: C2FLR, XRP (cross-chain), and Bitcoin Lightning

### **Lightning Payment Flow:**

```
1. User configures policy (location, coverage, trigger)
   ↓
2. Selects "Bitcoin Lightning" payment option
   ↓
3. SatShield → LNBits: Generate BOLT11 invoice
   ↓
4. Display QR code + invoice string (e.g., 1.28M sats)
   ↓
5. User scans with Lightning wallet (Phoenix, HTLC.me, etc.)
   ↓
6. Payment sent via Lightning Network
   ↓
7. SatShield polls LNBits every 3 seconds
   ↓
8. Payment confirmed → Policy minted on Flare blockchain
```

### **Architecture:**

```
┌──────────────┐
│  SatShield   │ (React Frontend)
└──────┬───────┘
       │ HTTP API
       ▼
┌──────────────┐
│   LNBits     │ (Wallet Manager)
└──────┬───────┘
       │ Connects to...
       ▼
┌────────────────────────┐
│  Lightning Backend     │
│  • FakeWallet (dev)    │
│  • LND (production)    │
│  • Core Lightning      │
│  • LNDhub (custodial)  │
└────────────────────────┘
```

### **Implementation Files:**

- **`useLightningInvoice.ts`** - Lightning payment hook with polling logic
- **`LightningPayment.tsx`** - Payment UI component with QR display
- **`BitcoinPriceWidget.tsx`** - Live BTC/USD price widget
- **`scripts/setup-lnbits.sh`** - Automated LNBits setup
- **`LIGHTNING_SETUP.md`** - Complete setup guide

### **Quick Setup:**

```bash
# 1. Run setup script (starts LNBits with FakeWallet)
./scripts/setup-lnbits.sh

# 2. Get API key from http://localhost:5001
# 3. Update .env with your key

# 4. Configure for real Lightning
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5001
VITE_LNBITS_API_KEY=your_invoice_read_key
```

> 📖 **Full Documentation**: See [LIGHTNING_SETUP.md](./LIGHTNING_SETUP.md) for production deployment

---

## 🏗️ Tech Stack

### **Blockchain:**

- Flare Network (Coston2 testnet)
- FTSO v2 Price Oracles
- FDC (Flare Data Connector) for external data

### **Frontend:**

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Framer Motion animations

### **Payments:**

- Bitcoin Lightning Network (LNBits)
- Cross-chain XRP payments
- C2FLR (Flare testnet tokens)

### **Backend:**

- Supabase (policies, user data, price history)
- Smart Contracts on Flare

---

## 📁 Project Structure

```
src/
├── components/
│   ├── policy/
│   │   ├── PolicyConfiguration.tsx    # Main policy flow
│   │   ├── LightningPayment.tsx       # ⚡ Lightning payment UI
│   │   └── CrossChainPayment.tsx      # XRP payment
│   ├── shared/
│   │   └── FTSOPriceTicker.tsx        # Live price ticker (FLR/XRP/BTC)
│   └── BitcoinPriceWidget.tsx         # ⚡ Bitcoin price widget
├── hooks/
│   ├── useLightningInvoice.ts         # ⚡ Lightning payment logic
│   └── useLightningInvoiceDemo.ts     # ⚡ Demo mode
├── pages/
│   ├── Dashboard.tsx                  # Main dashboard
│   └── ConfigurePolicy.tsx            # Policy configuration
└── contexts/
    ├── AuthContext.tsx
    └── WalletContext.tsx
```

---

## 🎮 Usage

### **1. Dashboard**

- View live prices (FLR, XRP, BTC)
- Browse risk pools
- See active policies

### **2. Configure Policy**

**Step 1**: Select location (map or search)
**Step 2**: Set coverage amount and duration
**Step 3**: Choose trigger threshold
**Step 4**: Run historical backtest
**Step 5**: Pay and mint on-chain

### **3. Payment Methods**

- **C2FLR** - Pay with Flare testnet tokens
- **XRP** - Cross-chain payment via FDC attestation
- **Bitcoin Lightning** ⚡ - Instant Bitcoin payments

---

## 🌟 Bitcoin Lightning Features

### **Live Bitcoin Price**

Shows BTC/USD price in:

- Dashboard ticker (orange-themed)
- Policy configuration (live prices section)
- Bitcoin price widget (detailed view)

### **Lightning Payment Component**

- **QR Code** - Scannable Lightning invoice
- **Copy Button** - One-click invoice copy
- **Real-time Status** - "Waiting for payment..." indicator
- **Success Animation** - Green checkmark on payment
- **Error Handling** - Clear messages with retry button

### **Premium Calculation**

Automatically converts premiums to:

- USD (base)
- C2FLR tokens
- XRP
- **Bitcoin** (BTC)
- **Satoshis** (for Lightning)

Example:

```
Coverage: $50,000 USD
Premium: $1,250 USD
= 1,280,000 sats
= 0.0128 BTC
```

---

## 🐳 Lightning Network Setup

### **Automated Setup (Recommended)**

Use the provided setup script for instant Lightning integration:

```bash
./scripts/setup-lnbits.sh
```

**What it does:**
1. Starts LNBits in Docker with your choice of backend:
   - **FakeWallet** (testing with real BOLT11 invoices)
   - **VoidWallet** (Bitcoin testnet)
   - **Custom** (your own LND/CLN node)
2. Configures port 5001
3. Provides step-by-step instructions

### **Manual Setup**

```bash
# Start LNBits with FakeWallet (for testing)
docker run -d -p 5001:5000 --name lnbits \
  -e LNBITS_BACKEND_WALLET_CLASS=FakeWallet \
  lnbits/lnbits:latest

# Get API key from http://localhost:5001
# Update .env with the Invoice/read key
```

### **Testing Payments**

With FakeWallet:
1. Generate invoice in SatShield
2. Invoice appears in LNBits dashboard
3. Manually mark as "paid" in LNBits
4. SatShield detects payment in ~3 seconds

### **Production Deployment**

For **real Bitcoin payments**, connect LNBits to:
- **LND node** (self-hosted Lightning node)
- **Core Lightning** (CLN node)
- **LNDhub** (custodial, easiest for production)

See [LIGHTNING_SETUP.md](./LIGHTNING_SETUP.md) for detailed instructions.

---

## 🎭 Demo Mode (Presentation Only)

For presentations when LNBits is unavailable:

```bash
# Enable in .env
VITE_LNBITS_DEMO_MODE=true
```

**What happens:**
- Shows "Demo Mode" badge
- Generates fake invoice (not real BOLT11)
- Auto-confirms after 5 seconds
- **Use only for presentations**

**⚠️ Not recommended for Summer of Bitcoin** - use FakeWallet instead for real Lightning invoice generation!

---

## 🏆 Achievements

- ✅ **Top 6 Finalist** at ETH Oxford 2024
- ✅ **Real Lightning Network** integration (BOLT11, LNBits)
- ✅ **Production-ready** Lightning backend support (LND, CLN, LNDhub)
- ✅ **FTSO Oracle** integration on Flare
- ✅ **Cross-chain payments** (XRP via FDC)
- ✅ **Automated setup** scripts for Lightning infrastructure
- ✅ **Beautiful UI/UX** with Tailwind + shadcn

---

## 📝 Environment Variables

```bash
# Bitcoin Lightning Network (Production - Default)
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5001
VITE_LNBITS_API_KEY=your_invoice_read_key

# Demo Mode (Presentations Only)
# VITE_LNBITS_DEMO_MODE=true

# Supabase (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

**Getting your LNBits API key:**
1. Run `./scripts/setup-lnbits.sh`
2. Open `http://localhost:5001`
3. Click wallet → "API info"
4. Copy "Invoice/read key" (NOT admin key!)

---

## 🎥 Demo Flow

1. **Setup** - Run `./scripts/setup-lnbits.sh` to start Lightning Network
2. **Dashboard** - Show Bitcoin price alongside FTSO prices
3. **Configure** - Select wildfire policy, $50K coverage
4. **Payment** - Click Bitcoin Lightning, generate real BOLT11 invoice with QR code
5. **Pay** - Mark as paid in LNBits (or scan with Lightning wallet)
6. **Detect** - SatShield polls and detects payment in ~3 seconds
7. **Mint** - Policy minted on Flare blockchain with Lightning payment proof

---

## 🔗 Links

- **Flare Network**: https://flare.network
- **LNBits**: https://lnbits.org
- **Summer of Bitcoin**: https://www.summerofbitcoin.org

---

## 👥 Team

Built by the SatShield team for ETH Oxford 2024 and Summer of Bitcoin.

---

## 📄 License

MIT

---

**⚡ Powered by Flare Network + Bitcoin Lightning**
