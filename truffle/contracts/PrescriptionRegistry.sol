// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrescriptionRegistry {
    struct Prescription {
        uint256 id;
        string patientId;
        string prescriptionHash;
        uint256 timestamp;
    }

    uint256 public prescriptionCounter;

    // Map prescription ID to Prescription
    mapping(uint256 => Prescription) public prescriptions;

    // Map patient ID to a list of their prescription IDs
    mapping(string => uint256[]) public patientPrescriptions;

    function addPrescription(string memory _patientId, string memory _prescriptionHash) public {
        prescriptionCounter++;
        prescriptions[prescriptionCounter] = Prescription({
            id: prescriptionCounter,
            patientId: _patientId,
            prescriptionHash: _prescriptionHash,
            timestamp: block.timestamp
        });
        patientPrescriptions[_patientId].push(prescriptionCounter);
    }

    // Get prescription IDs for a patient
    function getPrescriptionIds(string memory _patientId) public view returns (uint256[] memory) {
        return patientPrescriptions[_patientId];
    }

    // Get details for a specific prescription
    function getPrescriptionById(uint256 _id) public view returns (Prescription memory) {
        return prescriptions[_id];
    }
}
