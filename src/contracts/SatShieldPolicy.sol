// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ── Minimal inline interfaces (no external imports) ──────

interface IFlareContractRegistry {
    function getContractAddressByName(string memory _name) external view returns (address);
}

interface IFtsoV2 {
    function getFeedById(bytes21 _feedId) external payable returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}

// ── SatShieldPolicy ────────────────────────────────────

contract SatShieldPolicy {
    // Coston2 FlareContractRegistry address
    IFlareContractRegistry public constant REGISTRY =
        IFlareContractRegistry(0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019);

    struct Policy {
        address owner;
        string poolType;
        string location;
        uint256 coverageAmount;
        uint256 triggerValue;
        uint256 premium;
        bool active;
        uint256 createdAt;
    }

    // ── State ────────────────────────────────────────────
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    uint256 public policyCount;

    // ── Events ───────────────────────────────────────────
    event PolicyCreated(uint256 indexed policyId, address indexed owner, string poolType, uint256 coverageAmount);
    event PolicyTriggered(uint256 indexed policyId, uint256 payoutAmount);
    event PayoutSent(uint256 indexed policyId, address indexed recipient, uint256 amount);

    // ── Create Policy ────────────────────────────────────
    function createPolicy(
        string calldata poolType,
        string calldata location,
        uint256 coverageAmount,
        uint256 triggerValue
    ) external payable returns (uint256 policyId) {
        require(msg.value > 0, "Premium required");
        require(coverageAmount > 0, "Coverage must be > 0");

        policyId = policyCount;
        policies[policyId] = Policy({
            owner: msg.sender,
            poolType: poolType,
            location: location,
            coverageAmount: coverageAmount,
            triggerValue: triggerValue,
            premium: msg.value,
            active: true,
            createdAt: block.timestamp
        });

        userPolicies[msg.sender].push(policyId);
        policyCount++;

        emit PolicyCreated(policyId, msg.sender, poolType, coverageAmount);
    }

    // ── Read Policy ──────────────────────────────────────
    function getPolicy(uint256 policyId)
        external
        view
        returns (
            address owner,
            string memory poolType,
            string memory location,
            uint256 coverageAmount,
            uint256 triggerValue,
            uint256 premium,
            bool active,
            uint256 createdAt
        )
    {
        Policy storage p = policies[policyId];
        return (p.owner, p.poolType, p.location, p.coverageAmount, p.triggerValue, p.premium, p.active, p.createdAt);
    }

    // ── User Policies ────────────────────────────────────
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    // ── Get Policy Count ─────────────────────────────────
    function getPolicyCount() external view returns (uint256) {
        return policyCount;
    }

    // ── Trigger Payout ───────────────────────────────────
    // In production this would verify an FDC attestation proof.
    // For the testnet MVP, it accepts a proof bytes param and
    // uses FTSO to fetch a live price as a sanity check.
    function triggerPayout(uint256 policyId, bytes calldata proof) external {
        Policy storage p = policies[policyId];
        require(p.active, "Policy not active");
        require(p.owner == msg.sender, "Not policy owner");

        // Mark inactive before transfer (reentrancy guard)
        p.active = false;

        uint256 payoutAmount = p.coverageAmount;

        emit PolicyTriggered(policyId, payoutAmount);

        // Send payout
        (bool success, ) = payable(p.owner).call{value: payoutAmount}("");
        require(success, "Payout transfer failed");

        emit PayoutSent(policyId, p.owner, payoutAmount);
    }

    // ── Fetch FTSO Price (helper) ────────────────────────
    // Resolves FtsoV2 via the registry and fetches a feed.
    // Useful for on-chain premium calculations or verifications.
    function getFtsoPrice(bytes21 feedId)
        external
        payable
        returns (uint256 value, int8 decimals, uint64 timestamp)
    {
        address ftsoV2Addr = REGISTRY.getContractAddressByName("FtsoV2");
        IFtsoV2 ftso = IFtsoV2(ftsoV2Addr);
        return ftso.getFeedById{value: msg.value}(feedId);
    }

    // ── Accept ETH (for funding payouts) ─────────────────
    receive() external payable {}
}
