# ⚡ SatShield - Parametric Insurance on Flare Network

**Top 6 Finalist @ ETH Oxford 2026**

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

### **2. Setup Environment**

Copy `.env.example` to `.env`:

```bash
VITE_LNBITS_DEMO_MODE=true
```

### **3. Run**

```bash
npm run dev
```

Open **http://localhost:8080**

---

## ⚡ Bitcoin Lightning Integration

### **Key Features:**

- ✅ **3 Payment Methods**: C2FLR, XRP (cross-chain), and **Bitcoin Lightning**
- ✅ **Real-time BTC Price**: Live Bitcoin price from CoinGecko API
- ✅ **Lightning Invoices**: BOLT11 invoice generation with QR codes
- ✅ **Instant Verification**: 3-second payment detection via polling
- ✅ **Satoshi Conversion**: Premium calculated in sats automatically

### **Payment Flow:**

1. User configures policy (location, coverage, trigger)
2. Selects "Bitcoin Lightning" payment option
3. Invoice generated with QR code (e.g., 1.28M sats)
4. User pays from Lightning wallet (HTLC.me, Phoenix, etc.)
5. Payment detected in ~3 seconds
6. Policy minted on Flare blockchain

### **Implementation:**

- **`useLightningInvoice.ts`** - Lightning payment hook with polling
- **`LightningPayment.tsx`** - Payment UI with QR code display
- **`BitcoinPriceWidget.tsx`** - Live BTC/USD price widget
- **Demo Mode** - Simulates payments for presentations (auto-pays in 5s)

### **Try It:**

```bash
# Demo Mode (default)
VITE_LNBITS_DEMO_MODE=true

# Real Lightning (requires Docker + LNBits)
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5000
VITE_LNBITS_API_KEY=your_key_here
```

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

## 🎭 Demo Mode

Perfect for presentations when LNBits server is unavailable:

```bash
# Enable in .env
VITE_LNBITS_DEMO_MODE=true
```

**What happens:**

- Shows "Demo Mode" badge
- Generates fake Lightning invoice (looks real)
- Auto-pays after 5 seconds
- Perfect for hackathon demos!

---

## 🐳 Real Lightning Setup (Optional)

For real Bitcoin Lightning payments:

```bash
# 1. Run LNBits locally with Docker
docker run -d -p 5000:5000 --name lnbits lnbits/lnbits:latest

# 2. Get API key from http://localhost:5000
# - Click "Add wallet"
# - Click "API info"
# - Copy "Invoice/read key"

# 3. Update .env
VITE_LNBITS_URL=http://localhost:5000
VITE_LNBITS_API_KEY=your_key_here
VITE_LNBITS_DEMO_MODE=false
```

---

## 🏆 Achievements

- ✅ **Top 6 Finalist** at ETH Oxford 2024
- ✅ **Real Lightning Network** integration
- ✅ **FTSO Oracle** integration on Flare
- ✅ **Cross-chain payments** (XRP via FDC)
- ✅ **Production-ready** error handling
- ✅ **Beautiful UI/UX** with Tailwind + shadcn

---

## 📝 Environment Variables

```bash
# Bitcoin Lightning (Demo Mode - Default)
VITE_LNBITS_DEMO_MODE=true

# Bitcoin Lightning (Real Mode)
VITE_LNBITS_DEMO_MODE=false
VITE_LNBITS_URL=http://localhost:5000
VITE_LNBITS_API_KEY=your_lnbits_key

# Supabase (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🎥 Demo Video Flow

1. **Dashboard** - Show Bitcoin price alongside FTSO prices
2. **Configure** - Select wildfire policy, $50K coverage
3. **Payment** - Click Bitcoin Lightning, show QR code
4. **Pay** - Demo mode auto-pays in 5 seconds
5. **Mint** - Policy minted on Flare blockchain

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
