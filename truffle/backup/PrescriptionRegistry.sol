// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrescriptionRegistry {
    // Struct now contains only non-redundant data
    struct Prescription {
        uint40 timestamp;          // 40-bit timestamp (sufficient until 2318)
        address prescriber;        // Ethereum address of issuing entity
    }

    // Primary storage mapping: prescriptionHash -> Prescription data
    mapping(bytes32 => Prescription) public prescriptions;

    // Patient ID -> array of prescription hashes
    mapping(bytes32 => bytes32[]) public patientPrescriptions;

    // Access control
    address public owner;
    mapping(address => bool) public authorizedPrescribers;

    // Events for tracking
    event PrescriptionAdded(
        bytes32 indexed prescriptionHash,
        bytes32 indexed patientId,
        address prescriber
    );

    // Modifier for authorization check
    modifier onlyAuthorized() {
        require(authorizedPrescribers[msg.sender], "Unauthorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedPrescribers[msg.sender] = true;
    }

    // Core function to add prescriptions
    function addPrescription(
        bytes32 _patientId,
        bytes32 _prescriptionHash
    ) external onlyAuthorized {
        // Input validation
        require(_prescriptionHash != bytes32(0), "Invalid hash");
        require(prescriptions[_prescriptionHash].prescriber == address(0), 
            "Prescription already exists");

        // Store prescription data
        prescriptions[_prescriptionHash] = Prescription({
            timestamp: uint40(block.timestamp),
            prescriber: msg.sender
        });

        // Link to patient
        patientPrescriptions[_patientId].push(_prescriptionHash);
        
        emit PrescriptionAdded(_prescriptionHash, _patientId, msg.sender);
    }

    // Get all prescriptions for a patient
    function getPatientPrescriptions(bytes32 _patientId) 
        external view returns (bytes32[] memory) 
    {
        return patientPrescriptions[_patientId];
    }

    // Verify prescription belongs to patient
    function verifyPrescription(
        bytes32 _patientId,
        bytes32 _prescriptionHash
    ) external view returns (bool) {
        // Check if prescription exists
        if (prescriptions[_prescriptionHash].prescriber == address(0)) {
            return false;
        }
        
        // Check if patient has this prescription
        bytes32[] memory scripts = patientPrescriptions[_patientId];
        for (uint i = 0; i < scripts.length; i++) {
            if (scripts[i] == _prescriptionHash) {
                return true;
            }
        }
        return false;
    }

    // Management functions
    function addAuthorizedPrescriber(address _prescriber) external {
        require(msg.sender == owner, "Only owner");
        authorizedPrescribers[_prescriber] = true;
    }
}