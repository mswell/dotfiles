# DeFi Attack Vectors Reference

Common economic attack patterns for smart contract auditing. Each section includes the attack anatomy, detection patterns, and invariants to test.

---

## Flash Loan Attacks

**Anatomy:**
1. Borrow large amount (no collateral) from Aave/dYdX/Balancer
2. Use borrowed funds to manipulate state (price, balance, governance power)
3. Extract profit from manipulated state
4. Repay loan + fee in same transaction

**Detection — any of these in price/authority calculations = flash-loanable:**
```
balanceOf(address(this))     // Contract's own balance — manipulable via donation
balanceOf(address(pool))     // Pool balance — manipulable via flash swap
totalSupply()                // If supply-based pricing in same tx
getReserves()                // AMM reserves — manipulable via large swap
slot0()                      // Uniswap V3 spot price — manipulable
```

**Invariant to test:** "No single transaction should be able to change the price/exchange rate by more than X%"

**Common targets:**
- Governance: vote with flash-borrowed tokens → pass malicious proposal
- Vaults: manipulate share price → drain vault
- Lending: manipulate collateral price → avoid liquidation or force bad liquidation
- DEX: manipulate reserves → extract profit via arbitrage

---

## Oracle Manipulation

**Types:**
1. **Spot price oracle:** Using current AMM reserves/price — always manipulable in single tx
2. **TWAP oracle:** Time-weighted average — resistant but vulnerable if window is short
3. **Chainlink feed:** Trusted off-chain data — vulnerable to staleness, not to manipulation
4. **Custom oracle:** Protocol-specific — audit trust model

**Detection patterns:**
```
getReserves()        // Uniswap V2 spot price — NEVER use as oracle
slot0()              // Uniswap V3 spot price — NEVER use as oracle
observe()            // Uniswap V3 TWAP — safer but check window length
latestRoundData()    // Chainlink — check staleness
latestAnswer()       // Chainlink deprecated — missing round validation
```

**Chainlink staleness checklist:**
- `updatedAt` checked against heartbeat interval?
- `price > 0` validated?
- `answeredInRound >= roundId`?
- L2 sequencer uptime check? (Arbitrum, Optimism)
- Fallback oracle if primary is down?

**Invariant to test:** "Oracle price should not deviate more than X% from a reference within a single block"

---

## Sandwich Attacks

**Anatomy:**
1. Attacker sees victim's pending swap in mempool
2. Front-run: attacker buys token (moves price up)
3. Victim's swap executes at worse price
4. Back-run: attacker sells token (profits from price impact)

**Detection:**
- Swaps without `minAmountOut` protection (or set to 0)
- Missing `deadline` parameter (or `block.timestamp` which always passes)
- Large state-changing operations visible in mempool

**Patterns to grep:**
```
amountOutMin.*=.*0     // Hardcoded zero slippage
deadline.*block\.timestamp  // No-op deadline
```

---

## First Depositor / Vault Inflation

**Anatomy:**
1. Attacker is first depositor → deposits 1 wei → gets 1 share
2. Attacker donates large amount directly to vault (not via deposit)
3. Share price inflates: 1 share = 1 wei + donation
4. Next depositor: deposit / inflated_price rounds to 0 shares
5. Attacker redeems 1 share → gets original deposit + victim's deposit

**Detection:**
```solidity
// Vulnerable pattern
if (totalSupply == 0) {
    shares = assets;  // No minimum, no virtual offset
}
```

**Mitigations to check:**
- Virtual shares/assets offset: `totalSupply() + 1`, `totalAssets() + 1`
- Minimum first deposit requirement
- Dead shares: mint initial shares to address(0) or burn address
- OpenZeppelin ERC-4626 with `_decimalsOffset()`

**Invariant to test:** "Share price should not be manipulable by more than dust amount via donation"

---

## Price Manipulation via Reserves

**Anatomy (Uniswap V2 style):**
1. Pool has reserves: 100 ETH, 200,000 USDC (price = 2000 USDC/ETH)
2. Attacker swaps 900 ETH into pool → reserves: 1000 ETH, 20,000 USDC (price = 20 USDC/ETH)
3. Protocol reads manipulated price from `getReserves()`
4. Attacker exploits protocol using wrong price
5. Attacker swaps back to restore pool

**Detection:** Any protocol reading AMM reserves or spot price for business logic decisions

---

## Token Compatibility Issues ("Weird ERC20s")

| Token Type | Issue | Detection |
|---|---|---|
| Fee-on-transfer (STA, PAXG) | Received amount < sent amount | `transferFrom` without balance check |
| Rebasing (stETH, aToken, AMPL) | Balance changes without transfer | Cached balance becomes stale |
| ERC-777 (imBTC) | Transfer hooks enable reentrancy | `tokensReceived` callback |
| No return value (USDT) | `transfer` doesn't return bool | Using `IERC20.transfer` without SafeERC20 |
| Returns false (ZRX) | `transfer` returns false instead of reverting | Not checking return value |
| Non-18 decimals (USDC=6, WBTC=8) | Precision errors in calculations | Hardcoded `1e18` assumptions |
| Pausable (USDC, USDT) | Transfers can be frozen | No fallback for paused tokens |
| Blocklist (USDC, USDT) | Addresses can be blacklisted | No handling for blocked recipients |
| Upgradeable (USDC) | Token behavior can change | Trust assumption on issuer |
| Multiple entry points | Some tokens have multiple addresses | Using address for identity |
| Flash mintable (DAI) | Can mint unlimited temporarily | Balance-based authority |

**Invariant to test:** "Protocol accounting remains correct when interacting with non-standard ERC20 tokens"

---

## Governance Attacks

**Flash loan voting:**
- Borrow governance tokens → vote → return in same tx
- Mitigation: snapshot voting power at proposal creation block

**Proposal manipulation:**
- Low threshold → attacker creates malicious proposal
- Short voting period → not enough time for community response
- No timelock → immediate execution after vote

**Detection:**
```
proposalThreshold    // How much to create proposal?
votingDelay          // Delay between propose and vote start
votingPeriod         // How long is voting open?
quorum               // Minimum votes needed
timelock             // Delay before execution
```

---

## Read-Only Reentrancy

**Anatomy:**
1. Contract A has a `view` function returning state (e.g., `getSharePrice()`)
2. Contract A makes external call during state transition (e.g., sending ETH in withdrawal)
3. During callback, state is partially updated
4. Contract B (integrator) calls A's view function → gets stale/incorrect value
5. Contract B makes decisions based on wrong value

**Detection:**
- `view` functions reading state that's modified by functions with external calls
- Protocol has integrators that read its view functions for pricing

**Classic example:** Curve pool reentrancy — during `remove_liquidity`, pool sends ETH before updating internal accounting. Integrators reading pool's `get_virtual_price()` during callback get inflated price.

---

## Common DeFi Invariants Checklist

Test these for every protocol:

1. **Conservation of value:** total deposits == total withdrawals + current balance (accounting for fees)
2. **Share price monotonicity:** share price should only increase (for yield vaults)
3. **Withdrawal guarantee:** users can always withdraw their funds
4. **Access control:** only authorized roles can perform privileged operations
5. **Oracle accuracy:** protocol price should track reference price within bounds
6. **Liquidation correctness:** only truly underwater positions are liquidatable
7. **Fee bounds:** fees never exceed declared maximum
8. **Supply conservation:** total minted == total burned + current supply
9. **Proportional fairness:** rewards are distributed proportional to stake
10. **Atomic consistency:** no single transaction can extract more value than it provides
