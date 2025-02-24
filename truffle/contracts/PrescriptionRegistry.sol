// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrescriptionRegistry {
    struct Prescription {
        uint40 timestamp;
        address prescriber;
        bool isRevoked;
    }

    // Storage mappings
    mapping(bytes32 => Prescription) public prescriptions;  // Hash -> Metadata
    mapping(bytes32 => bytes32[]) public patientPrescriptions;  // Patient ID -> Prescription hashes

    // Access control
    address public owner;
    mapping(address => bool) public authorizedPrescribers;

    // Events
    event PrescriptionAdded(
        bytes32 indexed prescriptionHash,
        bytes32 indexed patientId,
        address prescriber
    );
    event PrescriptionRevoked(
        bytes32 indexed prescriptionHash,
        address revokedBy
    );
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event PrescriberAuthorizationChanged(
        address indexed prescriber,
        bool authorized
    );

    modifier onlyAuthorized() {
        require(authorizedPrescribers[msg.sender], "Unauthorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedPrescribers[msg.sender] = true;
    }

    // Core prescription functionality
    function addPrescription(
        bytes32 _patientId,
        bytes32 _prescriptionHash
    ) external onlyAuthorized {
        require(_prescriptionHash != bytes32(0), "Invalid hash");
        require(prescriptions[_prescriptionHash].prescriber == address(0), 
            "Prescription exists");

        prescriptions[_prescriptionHash] = Prescription({
            timestamp: uint40(block.timestamp),
            prescriber: msg.sender,
            isRevoked: false
        });

        patientPrescriptions[_patientId].push(_prescriptionHash);
        
        emit PrescriptionAdded(_prescriptionHash, _patientId, msg.sender);
    }

    function revokePrescription(bytes32 _prescriptionHash) external {
        Prescription storage p = prescriptions[_prescriptionHash];
        require(p.prescriber != address(0), "Prescription not found");
        require(
            msg.sender == p.prescriber || msg.sender == owner,
            "Not authorized"
        );
        
        p.isRevoked = true;
        emit PrescriptionRevoked(_prescriptionHash, msg.sender);
    }

    // Prescription accessors
    function getPatientPrescriptions(bytes32 _patientId)
        external
        view
        returns (bytes32[] memory)
    {
        return patientPrescriptions[_patientId];
    }

    function getPrescriptionDetails(bytes32 _prescriptionHash)
        external
        view
        returns (
            uint40 timestamp,
            address prescriber,
            bool isRevoked
        )
    {
        Prescription memory p = prescriptions[_prescriptionHash];
        require(p.prescriber != address(0), "Invalid prescription");
        return (p.timestamp, p.prescriber, p.isRevoked);
    }

    // Access control management
    function addAuthorizedPrescriber(address _prescriber) external onlyOwner {
        require(_prescriber != address(0), "Invalid address");
        authorizedPrescribers[_prescriber] = true;
        emit PrescriberAuthorizationChanged(_prescriber, true);
    }

    function removeAuthorizedPrescriber(address _prescriber) external onlyOwner {
        require(_prescriber != address(0), "Invalid address");
        authorizedPrescribers[_prescriber] = false;
        emit PrescriberAuthorizationChanged(_prescriber, false);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}