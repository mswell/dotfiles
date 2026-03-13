# Slither Detector Guide

Key detectors, severity mapping, common false positives, and targeted analysis flags.

---

## Running Slither

**Basic run:**
```bash
slither . --json .web3-audit/slither-output.json
```

**With remappings (Foundry):**
```bash
slither . --solc-remaps "$(cat remappings.txt | tr '\n' ' ')" --json .web3-audit/slither-output.json
```

**Exclude dependencies:**
```bash
slither . --filter-paths "lib/|node_modules/" --json .web3-audit/slither-output.json
```

**Specific detector only:**
```bash
slither . --detect reentrancy-eth,arbitrary-send-eth --json .web3-audit/slither-output.json
```

**Print specific info:**
```bash
slither . --print contract-summary      # Contract overview
slither . --print function-summary      # All functions with visibility
slither . --print human-summary         # Human-readable summary
slither . --print inheritance-graph     # Inheritance DOT graph
slither . --print call-graph            # Call graph DOT graph
slither . --print vars-and-auth         # State vars and access control
```

---

## High-Value Detectors (Prioritize These)

### Critical / High Impact

| Detector | What It Finds | Immunefi Severity |
|----------|--------------|-------------------|
| `reentrancy-eth` | Reentrancy with ETH transfer | Critical |
| `arbitrary-send-eth` | Unprotected ETH send to arbitrary address | Critical |
| `arbitrary-send-erc20` | Unprotected ERC20 transfer to arbitrary address | Critical |
| `suicidal` | Unprotected `selfdestruct` | Critical |
| `controlled-delegatecall` | `delegatecall` with user-controlled target | Critical |
| `uninitialized-state` | State variables never initialized | High |
| `uninitialized-storage` | Storage pointer not initialized | High |
| `unchecked-transfer` | ERC20 transfer without return check | High |
| `reentrancy-no-eth` | Reentrancy without ETH (state manipulation) | High |
| `tx-origin` | `tx.origin` used for authentication | High |
| `locked-ether` | ETH stuck in contract (no withdraw) | High |

### Medium Impact

| Detector | What It Finds | Immunefi Severity |
|----------|--------------|-------------------|
| `reentrancy-benign` | Reentrancy with only event/log changes | Medium |
| `reentrancy-events` | Reentrancy causing out-of-order events | Low-Medium |
| `controlled-array-length` | Array length controlled by user | Medium |
| `shadowing-state` | State variable shadowed in child contract | Medium |
| `uninitialized-local` | Local variable used before assignment | Medium |
| `weak-prng` | Weak randomness source | Medium |
| `divide-before-multiply` | Precision loss from division before multiplication | Medium |
| `incorrect-equality` | Strict equality on ETH balance | Medium |

### Informational (Usually Skip)

| Detector | Notes |
|----------|-------|
| `naming-convention` | Style only — skip |
| `solc-version` | Pragma version — note but rarely exploitable |
| `low-level-calls` | Informational — check return value handling manually |
| `missing-zero-check` | Often false positive in constructors/initializers |
| `too-many-digits` | Magic numbers — skip |
| `dead-code` | Unused functions — skip unless suspicious |

---

## Common False Positives per Detector

### `reentrancy-eth` / `reentrancy-no-eth`
**False positives:**
- Functions with `nonReentrant` modifier — Slither may not track OpenZeppelin's `ReentrancyGuard`
- Calls to trusted contracts (own protocol contracts, OpenZeppelin)
- `transfer()` / `send()` with 2300 gas stipend (insufficient for reentrancy, but post-EIP-1884 caution)
- State updates after `safeTransferFrom` to known ERC20 (no callback)

**Verify by:** Check if `nonReentrant` is applied. Check if callback is possible from the external call target.

### `arbitrary-send-eth` / `arbitrary-send-erc20`
**False positives:**
- Withdrawal functions where `msg.sender` gets their own balance back
- Admin-only functions with proper access control (Slither may miss custom modifiers)
- Functions where the recipient is derived from `msg.sender`'s state

**Verify by:** Check access control and whether recipient is user-controlled or attacker-controlled.

### `controlled-delegatecall`
**False positives:**
- Proxy patterns (intended delegatecall to implementation)
- Multicall patterns (delegatecall to self with different calldata)
- Diamond/EIP-2535 facet routing

**Verify by:** Is the target address user-controlled or from trusted storage?

### `unchecked-transfer`
**False positives:**
- Using SafeERC20's `safeTransfer` (Slither should catch this, but sometimes misses)
- Token contracts known to revert on failure (WETH, most modern tokens)
- Internal accounting that doesn't depend on transfer success

**Verify by:** Check if SafeERC20 is used. Check if the token is known to revert.

### `divide-before-multiply`
**False positives:**
- Intentional rounding (e.g., `amount / PRECISION * PRECISION` for rounding down)
- Different denominators (not actually losing precision)
- Constants that are powers of each other

**Verify by:** Check if precision loss is material and in attacker's favor.

---

## Severity Mapping: Slither → Immunefi

| Slither Severity | Default Immunefi Mapping | Adjust If... |
|-----------------|--------------------------|-------------|
| High | High → Critical | Leads to direct fund loss |
| Medium | Medium → High | Enables state manipulation exploitable for funds |
| Low | Low → Medium | Combined with other findings creates attack chain |
| Informational | Skip | Only report if part of attack chain |

**Key principle:** Slither severity reflects code pattern risk. Immunefi severity reflects actual impact. A Slither "medium" reentrancy that drains a pool is Immunefi "critical".

---

## Targeted Analysis Workflows

### Quick Triage (5 min)
```bash
slither . --detect reentrancy-eth,arbitrary-send-eth,arbitrary-send-erc20,suicidal,controlled-delegatecall --filter-paths "lib/|node_modules/"
```

### Access Control Review
```bash
slither . --print vars-and-auth --filter-paths "lib/"
slither . --detect unprotected-upgrade,missing-inheritance
```

### Economic Analysis
```bash
slither . --detect divide-before-multiply,incorrect-equality,unchecked-transfer,reentrancy-eth,reentrancy-no-eth
```

### Upgrade Safety
```bash
slither . --detect uninitialized-state,shadowing-state --filter-paths "lib/"
slither . --print human-summary  # Check for initializer patterns
```

### Full Audit Run
```bash
slither . --filter-paths "lib/|node_modules/|test/|script/" --json .web3-audit/slither-full.json --sarif .web3-audit/slither.sarif
```

---

## Parsing Slither JSON Output

Key fields in the JSON output:
```json
{
  "results": {
    "detectors": [
      {
        "check": "reentrancy-eth",           // Detector name
        "impact": "High",                     // Slither severity
        "confidence": "Medium",               // Detection confidence
        "description": "...",                 // Human-readable finding
        "elements": [                         // Affected code elements
          {
            "type": "function",
            "name": "withdraw",
            "source_mapping": {
              "filename_relative": "src/Vault.sol",
              "lines": [42, 43, 44, 45]
            }
          }
        ]
      }
    ]
  }
}
```

**Filter strategy:**
1. Sort by `impact`: High → Medium → Low
2. Filter `confidence`: High > Medium (skip Low confidence unless High impact)
3. Check `filename_relative`: skip if in lib/node_modules
4. Read `elements` for exact file:line locations
5. Cross-reference with manual analysis
