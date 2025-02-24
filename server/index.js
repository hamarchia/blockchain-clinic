// index.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Import the contract middleware and Mongoose models
const contractService = require('./blockchain/contract.js');
const Patient = require('./models/Patient');
const Prescription = require('./models/Prescription');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB (update the URI as needed)
mongoose
  .connect('mongodb://localhost:27017/blockchainDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  /**
 * Checks if the provided Ethereum address is authorized.
 * @param {string} address - Ethereum address to check.
 * @returns {Promise<boolean>} - Resolves to true if authorized, false otherwise.
 * @throws {Error} - If the address is missing or the check fails.
 */
async function checkIfAuthorized(address) {
  if (!address) {
    throw new Error('Ethereum address is required for authorization check.');
  }
  try {
    const authorized = await contractService.isAuthorized(address);
    return authorized;
  } catch (error) {
    console.error("Error checking authorization:", error);
    throw new Error('Failed to check authorization');
  }
}

/**
 * Computes a prescription hash using the prescription data.
 * @param {Object} prescriptionData - Contains medicines (array) and issuedAt (date string)
 * @returns {string} - The SHA-256 hash (in hex) of the prescription data.
 */
function computePrescriptionHash(prescriptionData) {
  const dataString = JSON.stringify({
    medicines: prescriptionData.medicines,
    issuedAt: prescriptionData.issuedAt
  });
  // MD5 returns 32 hex characters; we slice to 31 characters.
  const fullHash = crypto.createHash('md5').update(dataString).digest('hex');
  return fullHash.slice(0, 31);
}

/**
 * Endpoint: POST /patients
 * Accepts: { name, age, address }
 * Creates a new patient record with an empty blockchainPatientId.
 */
app.post('/patients', async (req, res) => {
  try {
    const { name, age, address } = req.body;
    if (!name || !age || !address) {
      return res.status(400).json({ error: 'Name, age, and address are required.' });
    }

    // Create a new patient record.
    // We set blockchainPatientId to an empty string until a prescription is added.
    const patient = new Patient({
      blockchainPatientId: '',
      name,
      age,
      address
    });
    await patient.save();

    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint: POST /prescriptions
 * Accepts: { patientId, medicines, issuedAt (optional) }
 *  - Computes a prescription hash from the provided data.
 *  - Calls the contract middleware to add the prescription on-chain.
 *  - Updates the patient record with the returned blockchainPatientId.
 *  - Saves a new Prescription record with the returned prescription hash (bytes32).
 */
app.post('/prescriptions', async (req, res) => {
  try {
    const { patientId, medicines, issuedAt } = req.body;
    if (!patientId || !medicines) {
      return res.status(400).json({ error: 'patientId and medicines are required.' });
    }
    
    // Use the provided issuedAt or default to current date in ISO format.
    const issuedAtTimestamp = issuedAt || new Date().toISOString();

    // Compute the prescription hash using the prescription data.
    const computedHash = computePrescriptionHash({
      medicines,
      issuedAt: issuedAtTimestamp
    });
    
    // Find the patient record by MongoDB _id.
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Call the contract middleware to add the prescription on-chain.
    // The middleware will convert the patientId and computedHash to bytes32.
    const blockchainResult = await contractService.addPrescription(patientId, computedHash);
    
    // Update the patient record with the blockchain patient id (bytes32 value).
    patient.blockchainPatientId = blockchainResult.patientId;
    await patient.save();
    
    // Create a new prescription record with the returned prescription hash (bytes32 value)
    // along with the medicines and issuedAt timestamp.
    const prescription = new Prescription({
      patientId: patient._id,
      prescriptionHash: blockchainResult.prescriptionHash,
      medicines,
      issuedAt: issuedAtTimestamp,
      isRevoked: false
    });
    await prescription.save();
    
    res.status(201).json({
      blockchain: blockchainResult,
      prescription,
      patient
    });
  } catch (error) {
    console.error('Error adding prescription:', error);
    res.status(500).json({ error: error.message });
  }
});

//dynamic prescriptions
app.post('/dynamicprescriptions', async (req, res) => {
  try {
    // Validate request body
    const { senderAddress, patientId, medicines, issuedAt } = req.body;
    if (!senderAddress || !patientId || !medicines) {
      return res.status(400).json({ 
        error: 'Missing required parameters: senderAddress, patientId, medicines,issuedAt'
      });
    }

     // Check if the senderAddress is authorized
     const isAuth = await checkIfAuthorized(senderAddress);
     if (!isAuth) {
       return res.status(403).json({ 
         error: 'Sender address is not authorized.' 
       });
     }

    // Use the provided issuedAt or default to current date in ISO format.
    const issuedAtTimestamp = issuedAt || new Date().toISOString();
    
    // Compute the prescription hash using the prescription data.
    const computedHash = computePrescriptionHash({
      medicines,
      issuedAt: issuedAtTimestamp
    });

    // Find the patient record by MongoDB _id.
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Execute blockchain operation
    const blockchainResult = await contractService.addPrescriptionDynamic(
      senderAddress,
      patientId,
      computedHash
    );

    // Update the patient record with the blockchain patient id (bytes32 value).
    patient.blockchainPatientId = blockchainResult.patientId;
    await patient.save();

    // Create a new prescription record with the returned prescription hash (bytes32 value)
    // along with the medicines and issuedAt timestamp.
    const prescription = new Prescription({
      patientId: patient._id,
      prescriptionHash: blockchainResult.prescriptionHash,
      medicines,
      issuedAt: issuedAtTimestamp,
      isRevoked: false
    });
    await prescription.save();


    // Return formatted response
    res.json({
      success: true,
      transaction: {
        hash: blockchainResult.txHash,
        block:blockchainResult.blockNumber,
        sender: blockchainResult.sender,
        patientId: blockchainResult.patientId,
        prescriptionHash: blockchainResult.prescriptionHash
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.reason || 'Blockchain transaction rejected'
    });
  }
});

// Endpoint to get prescriptions for a patient by their ID
app.get('/patients/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const prescriptions = await contractService.getPatientPrescriptions(patientId);
    res.status(200).json({ prescriptions });
  } catch (error) {
    console.error("Error retrieving patient prescriptions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: POST /prescriptions/revoke
app.post('/prescriptions/revoke', async (req, res) => {
  try {
    const { prescriptionHash } = req.body;
    if (!prescriptionHash) {
      return res.status(400).json({ error: 'prescriptionHash is required.' });
    }

    // Call the middleware to revoke the prescription on-chain.
    const result = await contractService.revokePrescription(prescriptionHash);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error revoking prescription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET /prescription
app.get('/prescription', async (req, res) => {
  try {
    const { prescriptionHash } = req.body;
    if (!prescriptionHash) {
      return res.status(400).json({ error: 'prescriptionHash is required.' });
    }

    // Call the middleware function to get prescription details from the blockchain.
    const details = await contractService.getPrescriptionDetails(prescriptionHash);
    
    res.status(200).json(details);
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: POST /prescribers
app.post('/prescribers', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Ethereum address is required.' });
    }

    // Call the contract middleware to add the authorized prescriber.
    const result = await contractService.addAuthorizedPrescriber(address);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error adding authorized prescriber:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
