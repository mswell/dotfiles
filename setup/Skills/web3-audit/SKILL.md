---
name: web3-audit
description: Smart contract security audit for Immunefi bug bounty. Analyzes Solidity contracts on EVM chains using Slither + Foundry. Covers access control, reentrancy, DeFi economic exploits (flash loans, oracle manipulation, MEV), protocol-specific logic (lending, DEX, bridges, vaults), and generates Foundry fork PoCs. Every finding MUST have concrete evidence, invariant violation proof, and USD impact estimate.
---

# Web3 Smart Contract Audit Skill

Multi-phase security analysis of Solidity smart contracts for Immunefi bug bounty programs.

**Rule #1: NO HALLUCINATION.** Every finding MUST be backed by concrete code evidence (file path + line + snippet), a proven invariant violation, and a reproducible exploit path.
**Rule #2: INVARIANT ANALYSIS MANDATORY.** Identify what should NEVER break (e.g., "total supply == sum of balances", "user can always withdraw"), then prove it CAN break. No invariant violation = no finding.
**Rule #3: BRAIN DUMP MANDATE.** Before listing vulnerabilities, document reasoning, invariants tested, dead ends, and false positive eliminations.
**Rule #4: Use Claude Code tools.** Prefer Grep/Glob/Read tools over shell equivalents. Reserve Bash ONLY for: `forge`, `slither`, `cast`, `chisel`, `mkdir`.
**Rule #5: QUALITY GATE.** Every finding MUST have: (a) exact file:line reference, (b) code snippet, (c) exploit scenario with steps, (d) impact in USD terms or protocol damage description, (e) Foundry PoC or clear PoC path.

## Tool Usage

Subagents MUST use Claude Code's dedicated tools:
- **Grep tool** for all text/pattern searches (NOT `grep`/`rg` via Bash)
- **Glob tool** for file discovery (NOT `find`/`ls` via Bash)
- **Read tool** for file reading (NOT `cat`/`head`/`tail` via Bash)
- **Bash tool** ONLY for: `forge build`, `forge test`, `forge script`, `slither`, `cast`, `chisel`, `mkdir`

## Directory Exclusions

ALL searches MUST exclude: `.git/`, `node_modules/`, `lib/forge-std/`, `lib/openzeppelin-contracts/`, `cache/`, `out/`, `artifacts/`, `typechain/`, `typechain-types/`

Target: `src/`, `contracts/`, or project-specific source directories only. Library/dependency code is out of scope unless explicitly included.

---

## Phase 0: Setup & Compilation

**Goal:** Validate tools, detect framework, compile contracts, identify scope. NOT delegated to subagents.

### Step 1: Validate Tools
```bash
which slither && slither --version || echo "WARNING: slither not found"
which forge && forge --version || echo "FATAL: forge not found"
```
Slither is recommended but not blocking. Forge is REQUIRED.

### Step 2: Detect Framework

| Indicator | Framework |
|---|---|
| `foundry.toml` | Foundry (preferred) |
| `hardhat.config.js` / `hardhat.config.ts` | Hardhat |
| `truffle-config.js` | Truffle |
| `brownie-config.yaml` | Brownie |
| `ape-config.yaml` | Ape |

If Hardhat/Truffle: check if Foundry config coexists. If not, use `forge init --force` to add Foundry support for PoC generation.

### Step 3: Compile
```bash
forge build
```
If compilation fails, check remappings (`remappings.txt` or `foundry.toml`), Solidity version, and missing dependencies (`forge install`).

### Step 4: Create Workspace
```bash
mkdir -p .web3-audit
```

### Step 5: Identify Scope
1. **In-scope contracts:** Read `src/` or `contracts/` — these are the target
2. **Library dependencies:** `lib/`, `node_modules/@openzeppelin/` — reference only, not audited
3. **Solidity version:** Check `pragma solidity` — versions `<0.8.0` have native overflow/underflow risk
4. **Proxy patterns:** Search for `delegatecall`, `ERC1967`, `TransparentUpgradeableProxy`, `UUPSUpgradeable`
5. **Contract count and inheritance tree:** Map which contracts inherit from which

### Step 6: Initial Assessment
Using Grep/Glob/Read:
1. **Read README/docs** for protocol description, tokenomics, design decisions
2. **Count in-scope contracts** and total Solidity LOC
3. **Identify protocol type** (lending, DEX, bridge, staking, governance, vault — needed for Phase 6)
4. **Map external dependencies** (Chainlink, Uniswap, Aave, etc.)

---

## Subagent Orchestration

Delegate to parallel specialized subagents, then PoC and report sequentially.

```
Wave 1 (PARALLEL — launch all three in a single message):
  ├── contract-auditor agent  → Phases 1 + 2 + 3 (Architecture + Access Control + Reentrancy)
  ├── contract-auditor agent  → Phases 4 + 5 (DeFi Economic + Common Solidity Patterns)
  └── security agent          → Phases 6 + 7 (Protocol-Specific + Slither)

Wave 2 (SEQUENTIAL — after Wave 1 completes):
  └── contract-auditor agent  → Phase 8 (PoC Generation with Foundry)

Wave 3 (SEQUENTIAL — after Wave 2 completes):
  └── report-writer agent     → Phase 9 (Immunefi Report)
```

**Steps:**
1. **Phase 0:** Run setup yourself (NOT delegated).
2. **Wave 1:** Launch 3 `Agent` calls in parallel. Provide each with:
   - Full phase instructions for their assigned phases
   - Codebase path, Solidity version, protocol type from Phase 0
   - Agent 1 (Phases 1+2+3): `references/solidity-vulnerability-patterns.md`
   - Agent 2 (Phases 4+5): `references/defi-attack-vectors.md`, `references/solidity-vulnerability-patterns.md`
   - Agent 3 (Phases 6+7): `references/slither-detector-guide.md`, protocol type for Phase 6 specialization
3. **Wave 2:** Launch `contract-auditor` with all Wave 1 findings + `references/foundry-poc-templates.md`. Generate PoCs for each confirmed finding.
4. **Wave 3:** Launch `report-writer` with all findings + PoC results + `references/immunefi-report-template.md`.
5. Output `.web3-audit/report.md` path.

---

## Workflow Overview

```
Phase 0: Setup & Compilation          → forge build, scope identification, framework detection
Phase 1: Protocol Architecture        → inheritance, roles, token flows, invariants, external deps
Phase 2: Access Control               → onlyOwner, roles, proxy auth, initializers, centralization
Phase 3: Reentrancy & External Calls  → CEI, cross-function, cross-contract, read-only, callbacks
Phase 4: DeFi Economic Vulns          → oracles, flash loans, slippage, rounding, token compat
Phase 5: Common Solidity Patterns     → overflow, signatures, DoS, storage collision, tx.origin
Phase 6: Protocol-Specific Logic      → lending/DEX/bridge/staking/governance/vault specifics
Phase 7: Slither Analysis             → automated detection + manual cross-reference
Phase 8: PoC Generation (Foundry)     → fork mainnet, exploit test, assert profit/loss
Phase 9: Immunefi Report              → severity, impact, PoC, fix recommendation
```

---

## Phase 1: Protocol Architecture & Invariants

**Goal:** Understand the protocol design, map trust boundaries, and define invariants to break.

**Process:**
1. **Documentation:** Read README, NatSpec (`@notice`, `@dev`, `@param`), inline comments for intended behavior
2. **Contract hierarchy:** Map inheritance chains — which contracts inherit from which? Identify proxy patterns (UUPS, Transparent, Beacon, Diamond/EIP-2535)
3. **Key roles:** Search for `onlyOwner`, `onlyRole`, `hasRole`, `msg.sender ==`, custom modifiers — document who can call what
4. **Token flows:** Map mint → transfer → burn paths. Stake → reward → unstake. Deposit → borrow → repay → liquidate.
5. **External integrations:**
   - Chainlink: `AggregatorV3Interface`, `latestRoundData`
   - Uniswap: `IUniswapV2Router`, `ISwapRouter`, `IUniswapV3Pool`
   - Aave: `IPool`, `IFlashLoanReceiver`
   - Other: `IERC20`, `IERC721`, bridges, oracles
6. **State variables:** Identify critical storage vars that control protocol behavior (e.g., `totalSupply`, `balances`, `reserves`, `exchangeRate`)

**CRITICAL — Define Invariants:**
For each invariant, write: "It should ALWAYS be true that [X]. If [X] breaks, the impact is [Y]."

Common invariants to test:
- `totalSupply == sum(balances[addr]) for all addr`
- "Users can always withdraw their deposited funds"
- "Only authorized roles can mint/burn tokens"
- "Oracle price cannot be manipulated within a single transaction"
- "Liquidation only occurs when position is actually underwater"
- "Protocol fees never exceed declared percentage"
- "Share price is monotonically non-decreasing (for yield vaults)"

---

## Phase 2: Access Control & Centralization

**Goal:** Find missing or bypassable access control, centralization risks, and upgrade dangers.

**Search patterns (use Grep tool on source directories):**

1. **Access control modifiers:**
   - `onlyOwner`, `onlyRole`, `onlyAdmin`, `onlyOperator`, `onlyGuardian`
   - Custom modifiers: `modifier\s+\w+` — read each one, verify they actually check authorization
   - `require\(msg\.sender\s*==` — hardcoded address checks

2. **Missing access control:**
   - State-changing `external`/`public` functions WITHOUT access modifiers
   - Grep for `function\s+\w+\s*\([^)]*\)\s*(external|public)` then verify each has appropriate restriction
   - Functions that call `selfdestruct`, `delegatecall`, or modify critical state vars

3. **Centralization risks:**
   - Single owner key controlling upgrades, pauses, parameter changes
   - No timelock on sensitive operations (parameter changes, upgrades)
   - No multisig requirement for high-impact actions
   - `renounceOwnership` — can admin irreversibly lock protocol?

4. **Proxy & upgrade safety:**
   - UUPS: `_authorizeUpgrade` — who can call it? Is it behind timelock?
   - TransparentProxy: admin vs implementation separation
   - Storage layout: gaps (`__gap`), EIP-1967 slots
   - `initializer` modifier — can `initialize()` be called more than once?
   - Constructor vs initializer: `_disableInitializers()` in constructor?

5. **Emergency mechanisms:**
   - `pause()` / `unpause()` — who controls? Can pauser freeze user funds indefinitely?
   - Emergency withdraw functions — do they bypass normal accounting?
   - `selfdestruct` / `SELFDESTRUCT` opcode usage

6. **Initializer vulnerabilities:**
   - Uninitialized proxies: can attacker call `initialize()` on implementation contract?
   - Missing `_disableInitializers()` in implementation constructor
   - Double initialization: `initializer` vs `reinitializer` — version tracking

---

## Phase 3: Reentrancy & External Calls

**Goal:** Find reentrancy vectors including cross-function, cross-contract, and read-only variants.

**Search patterns:**

1. **CEI (Checks-Effects-Interactions) violations:**
   - Find external calls: `.call(`, `.transfer(`, `.send(`, `safeTransfer(`, `safeTransferFrom(`
   - Check if state updates (Effects) happen AFTER the external call (Interaction)
   - Pattern: state read → external call → state write = CEI violation

2. **Cross-function reentrancy:**
   - Two functions share state variable — function A makes external call, function B reads stale state
   - Common: `withdraw()` calls external → `balanceOf()` returns pre-withdrawal balance
   - Map which functions share critical state vars

3. **Cross-contract reentrancy:**
   - Contract A calls external → callback reaches Contract B in same protocol → B reads stale state from A
   - Common in protocols with multiple interacting contracts (router + pool + token)

4. **Read-only reentrancy:**
   - `view`/`pure` functions returning state that's inconsistent during a callback
   - Example: vault `sharePrice()` returns stale value during deposit callback
   - Integrating protocols reading this value get incorrect price
   - Search for `view` functions that read state modified by non-view functions with external calls

5. **Callback vectors:**
   - ERC-777: `tokensReceived` hook on transfer
   - ERC-1155: `onERC1155Received`, `onERC1155BatchReceived`
   - ERC-721: `onERC721Received`
   - Flash loan callbacks: `executeOperation`, `onFlashLoan`
   - Uniswap: `uniswapV2Call`, `uniswapV3FlashCallback`, `uniswapV3SwapCallback`

6. **Low-level call safety:**
   - `.call{value:}("")` — return value checked? `(bool success, ) = addr.call{...}(...); require(success);`
   - `.delegatecall()` — target address trusted? Can attacker control target?
   - `.staticcall()` — used where state modification must be prevented?

7. **ReentrancyGuard usage:**
   - `nonReentrant` modifier — applied on ALL external-facing state-changing functions?
   - Gaps: function A has guard, function B doesn't but shares state = bypassable
   - Cross-contract: guard on Contract A doesn't protect Contract B

---

## Phase 4: DeFi Economic Vulnerabilities

**Goal:** Find economic exploits: oracle manipulation, flash loans, price manipulation, rounding attacks.

**Reference:** Read `references/defi-attack-vectors.md` for detailed attack patterns.

**Search patterns:**

1. **Oracle manipulation:**
   - Chainlink: `latestRoundData()` — is staleness checked? (`updatedAt + heartbeat > block.timestamp`)
   - Spot price as oracle: using `getReserves()`, `balanceOf()` on pool as price source = manipulable
   - TWAP: window too short = manipulable with sustained capital
   - Multiple oracles: fallback mechanism if primary fails?
   - Search: `latestRoundData`, `getReserves`, `slot0`, `observe`, `consult`

2. **Flash loan vectors:**
   - Any check using `balanceOf(address(this))` or token balance as authority = flash-loanable
   - Governance: vote power from token balance at current block (not snapshot) = flash loan voting
   - Price calculated from reserves/balances in same transaction = manipulable
   - Search: `balanceOf`, `totalSupply` used in calculations within same tx

3. **Slippage & MEV:**
   - Missing `minAmountOut` parameter on swaps (hardcoded to 0 = infinite slippage)
   - Missing `deadline` parameter — tx can be held by miner and executed later at worse price
   - `block.timestamp` as deadline = no deadline (always passes)
   - Search: `amountOutMin`, `minAmountOut`, `deadline`, `block.timestamp`

4. **Precision & rounding:**
   - Division before multiplication: `(a / b) * c` loses precision vs `(a * c) / b`
   - Rounding direction: should round against user in protocol's favor
   - Share price calculation: `assets * totalShares / totalAssets` — can attacker make denominator 0?
   - Integer division truncation to 0: small amounts round to 0 shares/tokens
   - Search: patterns with `/` followed by `*`, `mulDiv`, `FullMath`

5. **First depositor / vault inflation attack:**
   - Empty vault: first depositor gets shares based on their deposit
   - Attacker: deposit 1 wei → donate large amount to vault → inflate share price
   - Next depositor: gets 0 shares due to rounding
   - Mitigation: virtual shares/assets, minimum deposit, dead shares
   - Search: `totalSupply() == 0`, `totalAssets`, initial deposit logic

6. **Token compatibility:**
   - Fee-on-transfer tokens: actual received amount < specified amount
   - Rebasing tokens: balance changes without transfer (aTokens, stETH)
   - ERC-777 hooks: reentrancy vector on transfer
   - Non-standard decimals: tokens with >18 or <18 decimals
   - Tokens returning `false` instead of reverting on failure
   - Missing return value: USDT doesn't return bool on `transfer`
   - Search: `IERC20`, `safeTransfer`, `transfer(`, `transferFrom(`

7. **MEV extraction:**
   - Sandwich-vulnerable operations: large swaps, liquidations
   - Front-runnable: oracle updates, governance proposals, NFT mints
   - Back-runnable: arbitrage after state change

---

## Phase 5: Common Solidity Patterns

**Goal:** Find classic Solidity vulnerabilities.

**Reference:** Read `references/solidity-vulnerability-patterns.md` for detailed patterns.

1. **Integer overflow/underflow:**
   - Solidity `<0.8.0`: all arithmetic is unchecked by default
   - `>=0.8.0`: check `unchecked { }` blocks — arithmetic inside is not protected
   - Type casting: `uint256` to `uint128`/`int256` — silent truncation or sign flip
   - Search: `unchecked`, `uint8`, `uint128`, `int256`, type casts

2. **Signature vulnerabilities:**
   - Replay: missing `nonce` in signed message → same sig reusable
   - Cross-chain replay: missing `chainId` → sig valid on other chains
   - EIP-712: proper domain separator with name, version, chainId, verifyingContract?
   - `ecrecover` returns `address(0)` on invalid sig — must check `!= address(0)`
   - Signature malleability: `s` value in upper half → use OpenZeppelin ECDSA
   - Search: `ecrecover`, `ECDSA`, `EIP712`, `_hashTypedDataV4`, `nonces`

3. **Front-running / commit-reveal:**
   - Operations where seeing pending tx gives advantage (NFT mint, governance vote, liquidation)
   - Missing commit-reveal for sensitive operations
   - Search: `commit`, `reveal`, `nonce`, `deadline`

4. **Denial of Service:**
   - Unbounded loops: `for (uint i = 0; i < array.length; i++)` where array grows unbounded = gas limit DoS
   - External call in loop: one failure reverts entire batch
   - Gas griefing: `call` that forwards all gas to untrusted address
   - Pull over push: sending ETH to many addresses vs letting them withdraw
   - Search: `for (`, `while (`, `.length` in loop condition

5. **Storage collision (proxy patterns):**
   - EIP-1967 compliance: admin/implementation/beacon slots at specific locations
   - Custom proxy without proper slot isolation
   - Inherited storage layout mismatch between proxy versions
   - Missing `__gap` in upgradeable base contracts
   - Search: `EIP1967`, `StorageSlot`, `__gap`, `bytes32 private constant`

6. **Unchecked return values:**
   - `transfer()` vs `safeTransfer()` — ERC20 `transfer` may return false
   - Low-level `.call()` — must check `(bool success,)` return
   - `approve()` — some tokens require approve(0) before approve(newAmount)
   - Search: `.call(`, `.send(`, `transfer(`, `approve(`

7. **tx.origin authentication:**
   - `require(tx.origin == owner)` — phishable via malicious contract
   - Search: `tx.origin`

8. **Block dependence:**
   - `block.timestamp` for randomness = miner-manipulable
   - `block.number` as timer — block times vary
   - `blockhash` only available for last 256 blocks
   - Search: `block.timestamp`, `block.number`, `blockhash`

9. **Uninitialized proxy:**
   - Implementation contract without `_disableInitializers()` in constructor
   - Attacker calls `initialize()` directly on implementation → becomes owner
   - Search: `_disableInitializers`, `constructor`, `initialize`

10. **CREATE2 redeployment:**
    - `selfdestruct` + CREATE2 at same address = different bytecode
    - Post-Cancun: `selfdestruct` only sends ETH, doesn't delete code (EIP-6780)
    - Search: `create2`, `CREATE2`, `selfdestruct`

---

## Phase 6: Protocol-Specific Logic

**Goal:** Deep analysis based on protocol type detected in Phase 1.

Based on protocol type, focus on the relevant section below:

### Lending Protocol
- Liquidation math: can underwater positions always be liquidated? Can healthy positions be liquidated?
- Interest rate model: extreme utilization → correct rate? Overflow at boundaries?
- Bad debt: what happens when collateral < debt after liquidation? Socialized?
- Collateral factor / LTV: can attacker manipulate to avoid liquidation?
- Oracle dependency: stale price → wrong liquidation threshold
- Flash loan interaction: borrow + manipulate collateral price + liquidate in one tx?

### DEX / AMM
- Swap math: constant product (x*y=k), concentrated liquidity tick math
- LP share calculation: proportional deposit? Can attacker manipulate pool ratio?
- Fee calculation: rounding in fee extraction, fee-on-transfer token handling
- Concentrated liquidity: tick boundary crossing, position management
- Sandwich attacks: large swaps without slippage protection
- Pool initialization: who sets initial price? Can it be manipulated?

### Bridge
- Message verification: how are cross-chain messages authenticated?
- Replay protection: same message can't be executed twice
- Finality: source chain reorg → double-spend on destination
- Validator/relayer trust: centralized relayer = single point of failure?
- Token mapping: canonical vs synthetic tokens, supply invariant across chains

### Staking
- Reward calculation: `rewardPerShare` accumulator correctness
- Reward distribution: timing attack (stake just before distribution, unstake just after)
- Unbonding period: can it be bypassed? Is it enforced consistently?
- Slashing: does slashing math correctly reduce all stakers proportionally?
- Compounding: auto-compound vs manual claim — rounding in compound calc

### Governance
- Flash loan voting: vote with borrowed tokens, return after vote
- Snapshot mechanism: voting power snapshot before proposal or at current block?
- Proposal threshold: too low = spam, too high = centralization
- Quorum manipulation: abstain votes count toward quorum?
- Timelock: execution delay on passed proposals, can it be bypassed?
- Vote delegation: double-counting delegated votes?

### Vault / Yield Aggregator
- Share price calculation: `totalAssets()` accuracy, manipulable?
- First depositor attack: see Phase 4
- Withdrawal queue: FIFO fairness, can whale block withdrawals?
- Strategy risk: external protocol integration, composability risk
- Harvest manipulation: front-run harvest to capture yield without risk
- Emergency withdrawal: bypasses accounting? Creates bad debt?

---

## Phase 7: Slither Analysis

**Goal:** Run automated static analysis and cross-reference with manual findings.

**Reference:** Read `references/slither-detector-guide.md` for detector details and false positive filtering.

### Step 1: Run Slither
```bash
slither . --json .web3-audit/slither-output.json 2>&1 | tail -20
```
If Slither fails, try:
```bash
slither . --solc-remaps "$(cat remappings.txt | tr '\n' ' ')" --json .web3-audit/slither-output.json
```

### Step 2: Parse Results
Focus on high/medium severity detectors:
- `reentrancy-eth`, `reentrancy-no-eth` — reentrancy with ETH/state
- `arbitrary-send-eth`, `arbitrary-send-erc20` — unauthorized transfers
- `suicidal` — unprotected selfdestruct
- `uninitialized-state`, `uninitialized-local` — uninitialized variables
- `controlled-delegatecall` — delegatecall with user-controlled target
- `unchecked-transfer` — ERC20 transfer without return check
- `locked-ether` — ETH sent to contract with no withdraw function

### Step 3: Cross-Reference
- Match Slither findings with manual analysis from Phases 1-6
- Slither confirms manual → higher confidence
- Slither finds new → investigate manually before reporting
- Manual finds but Slither misses → document why (complex logic, cross-contract)

### Step 4: Filter False Positives
Using `references/slither-detector-guide.md`:
- Known false positive patterns per detector
- Library code flagged (exclude OpenZeppelin, forge-std)
- Informational findings (gas optimizations, naming conventions) — skip unless impactful

---

## Phase 8: PoC Generation (Foundry)

**Goal:** Create Foundry tests proving each vulnerability with concrete on-chain state.

**Reference:** Read `references/foundry-poc-templates.md` for exploit skeletons.

### Step 1: Setup Test File
Create `test/PoC.t.sol` (or `.web3-audit/PoC.t.sol` if test dir is in scope):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
// Import target contracts

contract PoCTest is Test {
    // Contract instances
    // Actor addresses

    function setUp() public {
        // Fork mainnet at specific block (if live protocol)
        // vm.createSelectFork(vm.envString("RPC_URL"), blockNumber);

        // Deploy or connect to contracts
        // Setup initial state
        // Label addresses for readable traces
        vm.label(address(this), "Attacker");
    }

    function testExploit_VulnTitle() public {
        // Record pre-exploit state
        uint256 attackerBalanceBefore = token.balanceOf(attacker);

        // Exploit steps
        // 1. ...
        // 2. ...
        // 3. ...

        // Assert: attacker profit / protocol loss / invariant violation
        uint256 attackerBalanceAfter = token.balanceOf(attacker);
        assertGt(attackerBalanceAfter, attackerBalanceBefore, "Attacker should profit");
    }
}
```

### Step 2: For Each Finding
- Create a separate `testExploit_*` function
- Fork at relevant block if live protocol: `vm.createSelectFork()`
- Use cheatcodes: `vm.prank()`, `vm.deal()`, `vm.warp()`, `vm.roll()`
- For flash loans: simulate with `vm.deal()` or integrate actual flash loan provider
- Assert concrete outcomes: profit amount, balance change, state corruption

### Step 3: Run Tests
```bash
forge test --match-contract PoCTest -vvv
```
`-vvv` for full trace on failure. `-vvvv` for raw call traces.

### Step 4: Document Results
For each PoC:
- Exact command to reproduce
- Expected output (passing assertion)
- Profit/loss amounts from trace
- Gas cost of exploit

---

## Phase 9: Immunefi Report

**Goal:** Generate Immunefi-formatted bug report for each confirmed finding.

**Reference:** Read `references/immunefi-report-template.md` for format and severity guide.

**Output:** Write `.web3-audit/report.md`

### Report Template

```markdown
# Brain Dump

## Protocol Overview
- **Protocol:** [name from README/docs]
- **Type:** [lending / DEX / bridge / staking / governance / vault / other]
- **Chain(s):** [Ethereum, Arbitrum, etc.]
- **Solidity Version:** [pragma version]
- **Framework:** [Foundry / Hardhat / mixed]
- **In-Scope Contracts:** [count] contracts, [LOC] lines of Solidity

## Invariants Defined & Tested
| # | Invariant | Result | Evidence |
|---|-----------|--------|----------|
| 1 | total supply == sum of all balances | HOLDS | tested in Phase 1 |
| 2 | users can always withdraw deposited funds | BROKEN | see VULN-001 |
| ... | ... | ... | ... |

## Attack Surface Summary
- **External functions without access control:** [count]
- **External calls (potential reentrancy points):** [count]
- **Oracle dependencies:** [list]
- **Flash loan vectors identified:** [count]
- **Proxy/upgrade pattern:** [type or none]

## Slither Results Summary
- **High:** [count] | **Medium:** [count] | **Low:** [count] | **Informational:** [count]
- **Confirmed by manual review:** [count]
- **False positives filtered:** [count with reasons]

## Analysis Log
- [Key decisions and reasoning during analysis]
- [Interesting patterns found, potential attack chains explored]
- [Protocol-specific logic analyzed]

## Dead Ends & False Positive Elimination
- [Patterns searched but not exploitable — with explanation]
- [Slither findings investigated and dismissed — specific reason]
- [Invariants tested but held — why they're safe]

---

# Immunefi Bug Report: [Protocol Name]

## [VULN-001] Title

### Bug Description
[Clear explanation of what's wrong, referencing specific contract and function]

**Severity:** Critical | High | Medium | Low (per Immunefi classification)
**Impact Category:** Loss of Funds | Manipulation of Governance | Protocol Insolvency | Theft of Yield | DoS

**Affected Contract(s):**
- `src/ContractName.sol` — function `vulnerableFunction()` (line XX)

**Invariant Violated:** "[specific invariant from Brain Dump]"

### Impact
[Concrete description of what an attacker achieves]
- **Estimated financial impact:** $X based on [current TVL / pool size / token price]
- **Affected users:** [all depositors / specific role / governance participants]

### Risk Breakdown
- **Difficulty:** [Low — single tx | Medium — requires setup | High — requires capital/timing]
- **Prerequisites:** [flash loan access / specific token balance / oracle condition]
- **Detection:** [on-chain observable / requires monitoring / stealth]

### Proof of Concept

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
// ... full PoC from Phase 8

// Run: forge test --match-test testExploit_VulnTitle -vvv
```

**Expected output:**
```
[paste relevant trace output showing exploit success]
```

### Recommended Fix
```solidity
// Before (vulnerable)
[exact vulnerable code]

// After (fixed)
[specific fix with explanation]
```
```
