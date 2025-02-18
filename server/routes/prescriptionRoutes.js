const express = require('express');
const Prescription = require('../models/Prescription');
const { addPrescriptionToBlockchain, getPrescriptionsFromBlockchain } = require('../blockchain/contract');
const crypto = require('crypto');

const router = express.Router();

//Helper function to compute the hash from MongoDB data (should match how you computed it in /add)
function computePrescriptionHash(prescriptionData) {
  const dataString = JSON.stringify({
    medicines: prescriptionData.medicines,
    issuedAt: prescriptionData.issuedAt
  });
  return crypto.createHash('sha256').update(dataString).digest('hex');
}


//Endpoint to add a prescription for a patient Id
router.post('/add', async (req, res) => {
  try {
    const { patientId, medicines } = req.body;
    
    // Ensure patientId is valid
    if (!patientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    
    // Capture the issued time and compute the hash using the helper function
    const issuedAt = new Date();
    const prescriptionData = { medicines, issuedAt };
    const prescriptionHash = computePrescriptionHash(prescriptionData);

    // Create a new prescription record including the issuedAt field
    const newPrescription = new Prescription({ patientId, medicines, issuedAt, prescriptionHash });
    await newPrescription.save();

    // Add the prescription hash to the blockchain
    const txHash = await addPrescriptionToBlockchain(patientId, prescriptionHash);

    res.json({ success: true, message: "Prescription added!", prescriptionId: newPrescription._id, txHash });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



router.get('/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // 1. Get on-chain prescriptions using the separate function.
    const onChainPrescriptions = await getPrescriptionsFromBlockchain(patientId);
    
    let results = [];
    // 2. For each on-chain prescription, verify and fetch MongoDB data.
    for (let onChainData of onChainPrescriptions) {
      const record = await Prescription.findOne({ prescriptionHash: onChainData.prescriptionHash });
      if (record) {
        const computedHash = computePrescriptionHash(record);
        if (computedHash === onChainData.prescriptionHash) {
          results.push(record);
        } else {
          results.push({
            error: `Data tampering detected for prescription ID ${onChainData.id}`,
            blockchainHash: onChainData.prescriptionHash,
            computedHash
          });
        }
      } else {
        results.push({ error: `No prescription found in DB for prescription ID ${onChainData.id}` });
      }
    }
    
    res.json({ success: true, prescriptions: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Endpoint to get details of a specific prescription by its ID from the blockchain

module.exports = router;
