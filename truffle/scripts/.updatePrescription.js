/*
  Run with: truffle exec scripts/updatePrescription.js
*/

const PrescriptionRegistry = artifacts.require("PrescriptionRegistry");

module.exports = async function(callback) {
  try {
    // Get the deployed contract instance
    const registry = await PrescriptionRegistry.deployed();
    
    // Example patient ID and prescription hash
    const patientId = "patient123";
    const prescriptionHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    // Read the current prescription (if any)
    let result = await registry.getPrescription(patientId);
    console.log(`Current prescription for ${patientId}:`, result);

    // Add or update the prescription
    const { tx } = await registry.addPrescription(patientId, prescriptionHash);
    console.log(`Transaction confirmed: ${tx}`);

    // Retrieve the updated prescription
    result = await registry.getPrescription(patientId);
    console.log(`Updated prescription for ${patientId}:`, result);

    callback();
  } catch (error) {
    console.error(error);
    callback(error);
  }
};
