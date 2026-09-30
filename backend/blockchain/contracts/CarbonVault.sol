// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CarbonVault {
    address public admin;

    struct Evidence {
        uint256 evidenceId;
        uint256 projectId;
        string evidenceHash;  // SHA-256 of the raw file
        uint256 timestamp;
    }

    // Mapping from evidenceId to Evidence
    mapping(uint256 => Evidence) public evidences;
    
    // Track total evidence logged
    uint256 public totalEvidenceLogged;

    event EvidenceLogged(uint256 indexed evidenceId, uint256 indexed projectId, string evidenceHash, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function logEvidence(uint256 _evidenceId, uint256 _projectId, string memory _evidenceHash) public onlyAdmin {
        require(bytes(_evidenceHash).length > 0, "Empty hash");
        require(evidences[_evidenceId].timestamp == 0, "Evidence already logged");

        evidences[_evidenceId] = Evidence({
            evidenceId: _evidenceId,
            projectId: _projectId,
            evidenceHash: _evidenceHash,
            timestamp: block.timestamp
        });

        totalEvidenceLogged += 1;

        emit EvidenceLogged(_evidenceId, _projectId, _evidenceHash, block.timestamp);
    }

    function verifyEvidence(uint256 _evidenceId, string memory _evidenceHash) public view returns (bool) {
        require(evidences[_evidenceId].timestamp != 0, "Evidence not found");
        // Compare hashes
        return (keccak256(abi.encodePacked(evidences[_evidenceId].evidenceHash)) == keccak256(abi.encodePacked(_evidenceHash)));
    }
}
