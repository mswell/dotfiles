# Foundry PoC Templates

Skeleton tests for common exploit types. Copy, adapt, and fill in protocol-specific details.

---

## Base Test Skeleton (Fork Setup)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// Import target contracts
// import "../src/VulnerableContract.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PoCTest is Test {
    // ========== CONSTANTS ==========
    // Mainnet addresses (replace with actual)
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant DAI  = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    // Aave V3 (Ethereum)
    address constant AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;

    // Uniswap V3 Router
    address constant UNISWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // ========== STATE ==========
    // VulnerableContract target;
    address attacker = makeAddr("attacker");
    address victim = makeAddr("victim");

    function setUp() public {
        // Fork mainnet at specific block
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000); // Replace block

        // Connect to deployed contracts
        // target = VulnerableContract(0x...);

        // Label for readable traces
        vm.label(attacker, "Attacker");
        vm.label(victim, "Victim");
        // vm.label(address(target), "Target");

        // Setup initial state if needed
        // vm.deal(attacker, 1 ether);
        // deal(address(USDC), attacker, 1_000_000e6);
    }

    function testExploit() public {
        // ===== PRE-STATE =====
        console.log("=== Pre-Exploit State ===");
        // uint256 attackerBefore = IERC20(USDC).balanceOf(attacker);
        // console.log("Attacker USDC:", attackerBefore);

        // ===== EXPLOIT =====
        vm.startPrank(attacker);

        // Step 1: ...
        // Step 2: ...
        // Step 3: ...

        vm.stopPrank();

        // ===== POST-STATE =====
        console.log("=== Post-Exploit State ===");
        // uint256 attackerAfter = IERC20(USDC).balanceOf(attacker);
        // console.log("Attacker USDC:", attackerAfter);
        // console.log("Profit:", attackerAfter - attackerBefore);

        // ===== ASSERTIONS =====
        // assertGt(attackerAfter, attackerBefore, "Attacker should profit");
    }
}
```

**Run command:**
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY forge test --match-test testExploit -vvv
```

---

## Flash Loan PoC (Aave V3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

contract FlashLoanPoC is Test {
    IPool constant aavePool = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    FlashLoanAttacker attacker;

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000);
        attacker = new FlashLoanAttacker();
        vm.label(address(attacker), "Attacker");
    }

    function testFlashLoanExploit() public {
        uint256 before = IERC20(USDC).balanceOf(address(attacker));
        attacker.attack();
        uint256 after_ = IERC20(USDC).balanceOf(address(attacker));

        console.log("Profit:", after_ - before);
        assertGt(after_, before, "Should profit from flash loan");
    }
}

contract FlashLoanAttacker {
    IPool constant aavePool = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function attack() external {
        uint256 borrowAmount = 1_000_000e6; // 1M USDC
        aavePool.flashLoanSimple(address(this), USDC, borrowAmount, "", 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata /* params */
    ) external returns (bool) {
        require(msg.sender == address(aavePool), "Not Aave");
        require(initiator == address(this), "Not self");

        // ===== EXPLOIT LOGIC HERE =====
        // Step 1: Use borrowed funds to manipulate
        // Step 2: Extract profit from manipulation
        // Step 3: ...

        // Repay flash loan
        uint256 repayAmount = amount + premium;
        IERC20(asset).approve(address(aavePool), repayAmount);
        return true;
    }
}
```

---

## Oracle Manipulation PoC

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn, uint amountOutMin, address[] calldata path,
        address to, uint deadline
    ) external returns (uint[] memory);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112, uint112, uint32);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

contract OracleManipulationPoC is Test {
    IUniswapV2Router constant router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    // IUniswapV2Pair constant pair = IUniswapV2Pair(0x...);
    // VulnerableProtocol constant target = VulnerableProtocol(0x...);

    address attacker = makeAddr("attacker");

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000);
    }

    function testOracleManipulation() public {
        vm.startPrank(attacker);

        // Step 1: Record pre-manipulation price
        // (uint112 r0, uint112 r1, ) = pair.getReserves();
        // uint256 priceBefore = uint256(r0) * 1e18 / uint256(r1);
        // console.log("Price before:", priceBefore);

        // Step 2: Large swap to manipulate pool reserves/price
        // IERC20(tokenA).approve(address(router), type(uint256).max);
        // address[] memory path = new address[](2);
        // path[0] = tokenA; path[1] = tokenB;
        // router.swapExactTokensForTokens(manipulationAmount, 0, path, attacker, block.timestamp);

        // Step 3: Exploit protocol using manipulated price
        // target.vulnerableFunction(...);

        // Step 4: Swap back to restore price (profit extraction)
        // path[0] = tokenB; path[1] = tokenA;
        // router.swapExactTokensForTokens(IERC20(tokenB).balanceOf(attacker), 0, path, attacker, block.timestamp);

        vm.stopPrank();

        // Assert profit
    }
}
```

---

## Reentrancy Exploit PoC

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// interface IVulnerable {
//     function deposit() external payable;
//     function withdraw(uint256 amount) external;
//     function balanceOf(address) external view returns (uint256);
// }

contract ReentrancyPoC is Test {
    // IVulnerable target;
    ReentrancyAttacker attacker;

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000);
        // target = IVulnerable(0x...);
        // attacker = new ReentrancyAttacker(address(target));
        // vm.deal(address(attacker), 1 ether);
    }

    function testReentrancy() public {
        // uint256 targetBalBefore = address(target).balance;
        // attacker.attack{value: 1 ether}();
        // uint256 stolen = targetBalBefore - address(target).balance;
        // console.log("Stolen:", stolen);
        // assertGt(stolen, 1 ether, "Should drain more than deposited");
    }
}

contract ReentrancyAttacker {
    // IVulnerable immutable target;
    uint256 public attackCount;

    // constructor(address _target) {
    //     target = IVulnerable(_target);
    // }

    // function attack() external payable {
    //     target.deposit{value: msg.value}();
    //     target.withdraw(msg.value);
    // }

    receive() external payable {
        attackCount++;
        // if (attackCount < 10 && address(target).balance >= 1 ether) {
        //     target.withdraw(1 ether);  // Re-enter
        // }
    }
}
```

---

## First Depositor / Vault Inflation PoC

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// interface IVault {
//     function deposit(uint256 assets, address receiver) external returns (uint256 shares);
//     function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
//     function totalSupply() external view returns (uint256);
//     function totalAssets() external view returns (uint256);
//     function balanceOf(address) external view returns (uint256);
// }

contract VaultInflationPoC is Test {
    // IVault vault;
    // IERC20 asset;
    address attacker = makeAddr("attacker");
    address victim = makeAddr("victim");

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000);
        // vault = IVault(0x...);
        // asset = IERC20(vault.asset());
        // deal(address(asset), attacker, 10_000e18);
        // deal(address(asset), victim, 10_000e18);
    }

    function testFirstDepositorAttack() public {
        // Step 1: Attacker is first depositor — deposit minimal amount
        vm.startPrank(attacker);
        // asset.approve(address(vault), type(uint256).max);
        // vault.deposit(1, attacker);  // 1 wei deposit → 1 share
        // console.log("Attacker shares:", vault.balanceOf(attacker));

        // Step 2: Attacker donates large amount directly to vault
        // asset.transfer(address(vault), 10_000e18 - 1);  // Inflate share price
        // console.log("Vault totalAssets:", vault.totalAssets());
        // console.log("Vault totalSupply:", vault.totalSupply());
        vm.stopPrank();

        // Step 3: Victim deposits — should get 0 shares due to rounding
        vm.startPrank(victim);
        // asset.approve(address(vault), type(uint256).max);
        // uint256 victimShares = vault.deposit(5_000e18, victim);
        // console.log("Victim shares:", victimShares);
        vm.stopPrank();

        // Step 4: Attacker redeems — gets victim's deposit too
        vm.startPrank(attacker);
        // uint256 attackerRedeemed = vault.redeem(vault.balanceOf(attacker), attacker, attacker);
        // console.log("Attacker redeemed:", attackerRedeemed);
        vm.stopPrank();

        // Assert: victim got 0 shares, attacker profited
        // assertEq(victimShares, 0, "Victim should get 0 shares");
    }
}
```

---

## Access Control Exploit PoC

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

contract AccessControlPoC is Test {
    address attacker = makeAddr("attacker");

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"), 19_000_000);
    }

    function testMissingAccessControl() public {
        vm.startPrank(attacker);

        // Call privileged function without authorization
        // target.privilegedFunction(...);

        // Assert: attacker successfully executed privileged action
        vm.stopPrank();
    }

    function testUninitializedProxy() public {
        // Call initialize() on implementation contract directly
        // Implementation impl = Implementation(IMPLEMENTATION_ADDRESS);
        // impl.initialize(attacker);  // Attacker becomes owner

        // Assert: attacker is now owner
        // assertEq(impl.owner(), attacker);
    }
}
```

---

## Useful Foundry Cheatcodes

```solidity
// State manipulation
vm.deal(addr, amount);                    // Set ETH balance
deal(address(token), addr, amount);       // Set ERC20 balance (forge-std)
vm.store(addr, slot, value);              // Write storage slot
vm.load(addr, slot);                      // Read storage slot

// Execution context
vm.prank(addr);                           // Next call from addr
vm.startPrank(addr);                      // All calls from addr until stopPrank
vm.stopPrank();
vm.warp(timestamp);                       // Set block.timestamp
vm.roll(blockNumber);                     // Set block.number
vm.fee(baseFee);                          // Set block.basefee

// Fork
vm.createSelectFork(rpcUrl, block);       // Fork at block
vm.createSelectFork(rpcUrl);              // Fork at latest
vm.rollFork(blockNumber);                 // Move fork to different block

// Assertions
assertEq(a, b, "msg");
assertGt(a, b, "msg");
assertLt(a, b, "msg");
assertApproxEqRel(a, b, maxPercentDelta, "msg"); // %, 1e18 = 100%

// Events & reverts
vm.expectRevert("reason");
vm.expectRevert(CustomError.selector);
vm.expectEmit(true, true, false, true);

// Labels
vm.label(addr, "name");                   // Label for traces

// Logging
console.log("msg", value);
console.log("balance: %s", balance);
```
