#!/bin/bash

# SatShield - LNBits Lightning Network Setup Script
# This script sets up LNBits with a real Lightning backend for Summer of Bitcoin

set -e

echo "⚡ SatShield Lightning Network Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"
echo ""

# Stop and remove existing LNBits container if it exists
if docker ps -a | grep -q lnbits; then
    echo "🗑️  Removing existing LNBits container..."
    docker stop lnbits 2>/dev/null || true
    docker rm lnbits 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Old container removed"
    echo ""
fi

# Ask user which backend to use
echo "Choose Lightning backend:"
echo ""
echo "  1) FakeWallet (Testing - generates real invoices, manual confirmation)"
echo "  2) VoidWallet (Testnet - connects to Bitcoin testnet)"
echo "  3) Custom (Advanced - provide your own LND/CLN connection)"
echo ""
read -p "Enter choice (1-3) [default: 1]: " BACKEND_CHOICE
BACKEND_CHOICE=${BACKEND_CHOICE:-1}

case $BACKEND_CHOICE in
    1)
        BACKEND="FakeWallet"
        echo -e "${YELLOW}⚙️  Using FakeWallet (Testing mode)${NC}"
        echo "   - Generates real BOLT11 invoices"
        echo "   - Manual payment confirmation in LNBits UI"
        echo "   - Perfect for development and demos"
        DOCKER_CMD="docker run -d -p 5001:5000 --name lnbits \
            -e LNBITS_BACKEND_WALLET_CLASS=FakeWallet \
            lnbits/lnbits:latest"
        ;;
    2)
        BACKEND="VoidWallet"
        echo -e "${YELLOW}⚙️  Using VoidWallet (Testnet mode)${NC}"
        echo "   - Free Bitcoin testnet"
        echo "   - No real money required"
        DOCKER_CMD="docker run -d -p 5001:5000 --name lnbits \
            -e LNBITS_BACKEND_WALLET_CLASS=VoidWallet \
            lnbits/lnbits:latest"
        ;;
    3)
        echo -e "${YELLOW}⚙️  Custom backend${NC}"
        echo "You'll need to configure LNBits manually."
        echo "Visit: http://localhost:5001 after starting the container"
        DOCKER_CMD="docker run -d -p 5001:5000 --name lnbits lnbits/lnbits:latest"
        ;;
    *)
        echo -e "${RED}Invalid choice. Using FakeWallet.${NC}"
        BACKEND="FakeWallet"
        DOCKER_CMD="docker run -d -p 5001:5000 --name lnbits \
            -e LNBITS_BACKEND_WALLET_CLASS=FakeWallet \
            lnbits/lnbits:latest"
        ;;
esac

echo ""
echo "🐳 Starting LNBits container..."
eval $DOCKER_CMD

# Wait for container to be ready
echo "⏳ Waiting for LNBits to start..."
sleep 5

# Check if container is running
if ! docker ps | grep -q lnbits; then
    echo -e "${RED}❌ Failed to start LNBits container${NC}"
    echo "Check logs with: docker logs lnbits"
    exit 1
fi

echo -e "${GREEN}✓${NC} LNBits is running!"
echo ""

# Instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}⚡ Next Steps:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open LNBits in your browser:"
echo -e "   ${YELLOW}http://localhost:5001${NC}"
echo ""
echo "2. Create a wallet (or use the default wallet)"
echo ""
echo "3. Get your API key:"
echo "   - Click on the wallet name"
echo "   - Find 'API info' section"
echo "   - Copy the 'Invoice/read key' (NOT the admin key!)"
echo ""
echo "4. Update your .env file:"
echo "   VITE_LNBITS_URL=http://localhost:5001"
echo "   VITE_LNBITS_API_KEY=<paste_your_key_here>"
echo "   VITE_LNBITS_DEMO_MODE=false"
echo ""
echo "5. Restart your dev server:"
echo "   npm run dev"
echo ""

if [ "$BACKEND" = "FakeWallet" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}📝 FakeWallet Usage:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "When testing payments:"
    echo "1. Generate invoice in SatShield"
    echo "2. Go to LNBits → Transactions"
    echo "3. Click on the pending invoice"
    echo "4. Manually mark it as 'Paid'"
    echo "5. SatShield will detect the payment!"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🔧 Useful Commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "View logs:        docker logs -f lnbits"
echo "Stop LNBits:      docker stop lnbits"
echo "Start LNBits:     docker start lnbits"
echo "Remove LNBits:    docker stop lnbits && docker rm lnbits"
echo "Re-run setup:     ./scripts/setup-lnbits.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Setup complete! Lightning Network is ready.${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
