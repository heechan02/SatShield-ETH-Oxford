

## Plan: Remove Manual Wallet Entry and Fix Payment Flow

### Problem
The "Manual Entry" wallet field on the Profile page lets users save an Ethereum address string, but this address **cannot sign transactions**. The policy configuration page treats a saved manual address as a valid wallet (`hasWallet = isConnected || !!profile?.wallet_address`), which lets users reach the Mint button -- but minting then fails because there's no signer. This creates a broken, confusing experience.

### Solution
Remove the manual wallet entry entirely and ensure only a real MetaMask connection counts as "having a wallet."

### Changes

**1. `src/pages/ProfilePage.tsx` -- Remove Manual Wallet Section**
- Delete the `manualWallet` state, `walletError` state, and `handleSaveManualWallet` function
- Remove the "Manual Entry" input block (the `<Separator>` + input + save button around lines 286-317)
- Remove the "Saved Address" display block (lines 240-250) since that was for manually entered addresses
- Update the wallet card description from "Connect MetaMask or enter an address manually" to "Connect MetaMask to interact with Flare"
- The `activeAddress` variable will simplify to just `metamaskAddress` (no fallback to `profile?.wallet_address`)

**2. `src/components/policy/PolicyConfiguration.tsx` -- Fix `hasWallet` Check**
- Change `hasWallet` from `isConnected || !!profile?.wallet_address` to just `isConnected`
- Remove the `useProfile` import and hook call since it's no longer needed for wallet checking
- This ensures only a real MetaMask connection (with a signer) enables the mint button

**3. `src/hooks/useProfile.ts` -- Keep As-Is**
- The `wallet_address` column and profile hooks remain untouched (the column may still be useful for other purposes like auto-saving the MetaMask address on connect, which `WalletContext` already does)

### What Stays the Same
- MetaMask connect/disconnect on the Profile page (untouched)
- Network status card (untouched)
- Smart Account / FAssets panel on the right column (untouched)
- The inline "Connect Wallet" prompt on the Mint step (already implemented, will now be the only path)
- Auto-saving the MetaMask address to the profile on connect (via `WalletContext.saveWalletToProfile`)

### User Experience After

```text
Profile Page:
  Wallet Card shows only "Connect MetaMask" button
  No manual entry field, no confusion

Policy Mint Step:
  hasWallet = true ONLY when MetaMask is connected (signer available)
  Inline "Connect MetaMask" prompt shown when not connected
  Mint button works immediately after connecting
```

