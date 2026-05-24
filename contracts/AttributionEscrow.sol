// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// AttributionEscrow.
// A generic operator-attributed escrow for Arc.
//
// Use case: the Operator (contract owner) credits Creators against arbitrary
// subject IDs, holding the USDC in this contract. Creators see their accrued
// balance and call claim() when they want to withdraw. Claims are intended to
// be wrapped in a Circle Paymaster v0.8 userOp so creators pay zero gas.
//
// The same primitive shows up in:
//  - Prediction-market builder codes (e.g. Babel Markets).
//  - Affiliate / referral splits.
//  - Marketplace revenue shares.
//  - Content royalties.
//
// PLATFORM FEE
// The contract takes a platform-fee share at credit time (bps, 0-10000). The
// remainder accrues to the registered creator for the subject id. Set to 0
// at deploy if you don't want a platform cut.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AttributionEscrow {
    address public owner;
    address public usdc;
    uint16 public immutable platformFeeBps;

    mapping(address => uint256) public accrued;
    mapping(bytes32 => address) public subjectCreator;

    event SubjectRegistered(bytes32 indexed subjectId, address indexed creator);
    event FeesCredited(bytes32 indexed subjectId, address indexed creator, uint256 amount);
    event Payout(address indexed creator, uint256 amount);

    error NotOwner();
    error NothingToClaim();
    error InvalidPlatformFee();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _usdc, uint16 _platformFeeBps) {
        if (_platformFeeBps > 10_000) revert InvalidPlatformFee();
        owner = msg.sender;
        usdc = _usdc;
        platformFeeBps = _platformFeeBps;
    }

    function registerSubject(bytes32 subjectId, address creator) external onlyOwner {
        subjectCreator[subjectId] = creator;
        emit SubjectRegistered(subjectId, creator);
    }

    function creditFees(bytes32 subjectId, uint256 amount) external onlyOwner {
        address creator = subjectCreator[subjectId];
        require(creator != address(0), "unknown subject");
        uint256 platformCut = (amount * platformFeeBps) / 10_000;
        uint256 creatorCut = amount - platformCut;
        accrued[creator] += creatorCut;
        if (platformCut > 0) {
            accrued[owner] += platformCut;
        }
        emit FeesCredited(subjectId, creator, creatorCut);
    }

    function claim() external {
        uint256 owed = accrued[msg.sender];
        if (owed == 0) revert NothingToClaim();
        accrued[msg.sender] = 0;
        require(IERC20(usdc).transfer(msg.sender, owed), "transfer failed");
        emit Payout(msg.sender, owed);
    }

    function payoutBatch(address[] calldata creators) external onlyOwner {
        for (uint256 i = 0; i < creators.length; ++i) {
            uint256 owed = accrued[creators[i]];
            if (owed == 0) continue;
            accrued[creators[i]] = 0;
            require(IERC20(usdc).transfer(creators[i], owed), "transfer failed");
            emit Payout(creators[i], owed);
        }
    }
}
