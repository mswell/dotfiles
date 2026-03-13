# Immunefi Bug Report Template

Format and guidelines for submitting vulnerability reports to Immunefi bug bounty programs.

---

## Immunefi Severity Classification

Immunefi uses its own severity scale (NOT generic CVSS). Classification is based on **impact**, not exploitability.

### Smart Contract Severity

| Severity | Impact | Typical Bounty Range |
|----------|--------|---------------------|
| **Critical** | Direct loss of funds (any amount), permanent freezing of funds, protocol insolvency, unauthorized minting with direct economic impact | $50K – $10M+ |
| **High** | Theft of unclaimed yield/fees, permanent freezing of unclaimed yield, temporary freezing of funds (>24h), manipulation of governance voting | $10K – $100K |
| **Medium** | Smart contract unable to operate (non-fund-threatening DoS), griefing (no profit to attacker, but loss to protocol), theft of gas, unbounded gas consumption | $1K – $25K |
| **Low** | Contract fails to deliver promised returns (minor), incorrect event emission, function-level issues without fund impact | $1K – $5K |

### Key Immunefi Rules
1. **Impact over exploitability:** A bug is classified by its worst-case impact, NOT how hard it is to exploit
2. **Loss of funds = Critical:** Any amount, any mechanism
3. **PoC required for Critical/High:** Runnable code proving the vulnerability
4. **In-scope only:** Bug must affect contracts listed in the program's scope
5. **No theoretical issues:** Must demonstrate concrete impact
6. **Known issues:** Check program's "Known Issues" section — duplicates are ineligible

---

## Report Structure

### Title
`[Severity] Brief description of the vulnerability`

Example: `[Critical] Reentrancy in withdraw() allows draining of all pool funds`

### Bug Description
Clear, technical explanation of the vulnerability:
- Which contract and function is affected
- What the intended behavior is
- What the actual (vulnerable) behavior is
- Root cause analysis

**Template:**
```
The `functionName()` in `ContractName.sol` (line XX) is vulnerable to [vulnerability type].

The function is intended to [expected behavior]. However, due to [root cause], an attacker can [attack description].

The root cause is [specific code issue]: [explain why the code is wrong].
```

### Impact
Concrete description following Immunefi's impact categories:

**For Loss of Funds:**
```
An attacker can steal approximately $X from the protocol by exploiting [mechanism].
Based on current TVL of $Y in the affected pool/contract at [address],
the maximum extractable value is [calculation].
```

**For Governance Manipulation:**
```
An attacker can manipulate governance by [mechanism], allowing them to
pass arbitrary proposals. This could lead to [worst case: treasury drain,
parameter manipulation, etc.].
```

**For DoS:**
```
An attacker can permanently prevent [users/function] from operating by
[mechanism]. The cost to the attacker is [X] while the protocol/users
lose [Y]. Recovery requires [manual intervention / upgrade / impossible].
```

### Risk Breakdown
```
Difficulty: [Low / Medium / High]
  - Low: Single transaction, no special conditions
  - Medium: Requires specific state or multiple transactions
  - High: Requires significant capital, precise timing, or rare conditions

Prerequisites:
  - [List each requirement: flash loan access, specific token balance, role, etc.]

Constraints:
  - [Any limitations on the exploit: block timing, gas costs, etc.]
```

### Proof of Concept

**REQUIRED for Critical and High severity.**

Must be runnable Foundry test or script:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

contract PoC is Test {
    function setUp() public {
        // Fork setup
        vm.createSelectFork("RPC_URL", BLOCK_NUMBER);
    }

    function testExploit() public {
        // Pre-state
        // Exploit steps (numbered and commented)
        // Post-state assertions proving impact
    }
}
```

**Include:**
- Exact reproduction steps
- Expected output (passing test)
- fork block number and chain
- Any required environment setup

### Recommended Fix

```solidity
// Before (vulnerable)
function vulnerable() external {
    // ... vulnerable code
}

// After (fixed)
function fixed() external {
    // ... fixed code with explanation of why this resolves the issue
}
```

Explain:
- What the fix changes
- Why it resolves the vulnerability
- Any trade-offs or considerations

---

## Report Quality Checklist

Before submitting, verify:

- [ ] Title clearly states severity and vulnerability type
- [ ] Bug description identifies exact contract, function, and line
- [ ] Root cause is clearly explained (not just symptoms)
- [ ] Impact is quantified in USD or concrete protocol damage
- [ ] Impact category matches Immunefi severity definitions
- [ ] PoC is a runnable Foundry test (for Critical/High)
- [ ] PoC demonstrates concrete impact (not just a revert or state read)
- [ ] Recommended fix is specific and correct
- [ ] Bug is in-scope per program's asset list
- [ ] Bug is not in "Known Issues" section
- [ ] No theoretical/hypothetical issues — only concrete, exploitable bugs
- [ ] Report is self-contained — reviewer can understand without external context

---

## Common Mistakes to Avoid

1. **Theoretical bugs without PoC:** "This COULD be exploited if..." → Rejected
2. **Out-of-scope contracts:** Always verify the program's scope
3. **Known issues:** Read the program description thoroughly
4. **Overclassifying severity:** DoS is not Critical unless it causes fund loss
5. **Gas optimization reports:** These are not security bugs
6. **Centralization risks as bugs:** Most programs exclude admin/owner trust assumptions
7. **Missing impact quantification:** "$X at risk" is required, not "funds could be lost"
8. **Non-reproducible PoC:** Test must pass, include exact block number and RPC
9. **Duplicate submission:** Search Immunefi for similar reports first
10. **Poor formatting:** Use markdown, code blocks, clear sections
