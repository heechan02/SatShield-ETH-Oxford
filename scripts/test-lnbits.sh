#!/bin/bash

# Test LNBits API Connection
echo "🧪 Testing LNBits Connection..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if container is running
echo "1️⃣  Checking if LNBits container is running..."
if docker ps | grep -q lnbits; then
    echo -e "${GREEN}✓${NC} LNBits container is running"
else
    echo -e "${RED}✗${NC} LNBits container is NOT running"
    echo "Run: ./scripts/setup-lnbits.sh"
    exit 1
fi
echo ""

# Test basic connection
echo "2️⃣  Testing basic HTTP connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓${NC} LNBits is accessible at http://localhost:5001 (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Cannot connect to LNBits (HTTP $HTTP_CODE)"
    echo "Check logs: docker logs lnbits"
    exit 1
fi
echo ""

# Check if API key is set in .env
echo "3️⃣  Checking .env configuration..."
if [ -f .env ]; then
    API_KEY=$(grep VITE_LNBITS_API_KEY .env | cut -d '=' -f2)
    if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_invoice_read_key_here" ]; then
        echo -e "${RED}✗${NC} API key not set in .env"
        echo "Get your key from: http://localhost:5001"
        exit 1
    else
        echo -e "${GREEN}✓${NC} API key found in .env: ${API_KEY:0:8}..."
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
    exit 1
fi
echo ""

# Test API with the key
echo "4️⃣  Testing LNBits API with your key..."
echo "   Testing: POST /api/v1/payments"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST http://localhost:5001/api/v1/payments \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "memo": "Test invoice",
    "unit": "sat"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓✓✓ SUCCESS! Lightning invoice created!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${GREEN}Your Lightning integration is working!${NC}"
    exit 0
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ 404 Error - API endpoint not found${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. Wrong API key (doesn't belong to this LNBits instance)"
    echo "  2. LNBits not fully initialized"
    echo "  3. Different LNBits version"
    echo ""
    echo "Solution:"
    echo "  1. Open: http://localhost:5001"
    echo "  2. Create a new wallet (or use default)"
    echo "  3. Copy the 'Invoice/read key' from API info"
    echo "  4. Update VITE_LNBITS_API_KEY in .env"
    echo "  5. Restart: npm run dev"
    exit 1
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Your API key is invalid or doesn't have permission"
    echo ""
    echo "Get a new key:"
    echo "  1. Visit: http://localhost:5001"
    echo "  2. Create/select wallet → API info"
    echo "  3. Copy 'Invoice/read key'"
    exit 1
else
    echo -e "${RED}✗ Unexpected error (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "Response:"
    echo "$BODY"
    echo ""
    echo "Check LNBits logs:"
    echo "  docker logs lnbits --tail 50"
    exit 1
fi
