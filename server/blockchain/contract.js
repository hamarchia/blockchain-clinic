// contract.js
const Web3 = require("web3").default;
const { ethers } = require('ethers');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const contract = require('@truffle/contract');
const prescriptionRegistryArtifact = require('../build/contracts/PrescriptionRegistry.json');

const mnemonic = "slab use spin wage doll post riot mixed water approve march debris";
const provider = new HDWalletProvider(mnemonic, "http://127.0.0.1:7545");
const web3 = new Web3(provider);

const PrescriptionRegistry = contract(prescriptionRegistryArtifact);
PrescriptionRegistry.setProvider(web3.currentProvider);

// Utility functions for bytes32 conversion
const toBytes32 = (input) => ethers.utils.formatBytes32String(input);
const fromBytes32 = (bytes32) => ethers.utils.parseBytes32String(bytes32);

const contractService = {
  /**
   * Initialize contract instance
   */
  async init() {
    try {
      this.instance = await PrescriptionRegistry.deployed();
      console.log("Contract deployed at:", this.instance.address);
      return this.instance;
    } catch (error) {
      console.error("Contract initialization failed:", error);
      process.exit(1);
    }
  },

  /**
   * Add prescription to blockchain
   * @param {string} patientId - Patient ID string
   * @param {string} prescriptionHash - Prescription hash string
   */
  async addPrescription(patientId, prescriptionHash) {
    try {
      const accounts = await web3.eth.getAccounts();
      const bytes32PatientId = toBytes32(patientId);
      const bytes32Hash = toBytes32(prescriptionHash);

      const tx = await this.instance.addPrescription(
        bytes32PatientId,
        bytes32Hash,
        { from: accounts[0] }
      );
      
      return {
        txHash: tx.tx,
        patientId: bytes32PatientId,
        prescriptionHash: bytes32Hash
      };
    } catch (error) {
      console.error("Add prescription error:", error);
      throw new Error('Failed to add prescription to blockchain');
    }
  },

  /**
 * Add prescription to blockchain with dynamic sender
 * @param {string} senderAddress - Ethereum address of transaction sender
 * @param {string} patientId - Patient ID string
 * @param {string} prescriptionHash - Prescription hash string
 */
async addPrescriptionDynamic(senderAddress, patientId, prescriptionHash) {
  try {
    // Validate sender address format
    if (!web3.utils.isAddress(senderAddress)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Get available accounts from provider
    const accounts = await web3.eth.getAccounts();
    const normalizedAddress = senderAddress.toLowerCase();
    
    // Check if sender is managed by wallet
    if (!accounts.some(acc => acc.toLowerCase() === normalizedAddress)) {
      throw new Error('Sender address not managed by this service');
    }

    // Convert parameters to blockchain format
    const bytes32PatientId = toBytes32(patientId);
    console.log(bytes32PatientId);
    //const bytes32Hash = toBytes32(prescriptionHash);
    const bytes32Hash = toBytes32(prescriptionHash);
    console.log(bytes32Hash);
    // Send transaction
    const tx = await this.instance.addPrescription(
      bytes32PatientId,
      bytes32Hash,
      { from: senderAddress } // Maintain original casing for from address
    );

    return {
      txHash: tx.tx,
      patientId: patientId,
      prescriptionHash: prescriptionHash,
      sender: senderAddress,
      blockNumber: tx.receipt.blockNumber
    };
  } catch (error) {
    console.error("Prescription creation error:", error);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
},

  /**
   * Get patient prescriptions
   * @param {string} patientId - Patient ID string
   */
  async getPatientPrescriptions(patientId) {
    try {
      const bytes32PatientId = toBytes32(patientId);
      const prescriptionHashes = await this.instance.getPatientPrescriptions(bytes32PatientId);
      
      return Promise.all(
        prescriptionHashes.map(async hash => {
          const details = await this.instance.getPrescriptionDetails(hash);
          return {
            prescriptionHash: fromBytes32(hash),
            timestamp: new Date(details.timestamp * 1000),
            prescriber: details.prescriber,
            isRevoked: details.isRevoked
          };
        })
      );
    } catch (error) {
      console.error("Get prescriptions error:", error);
      throw new Error('Failed to fetch prescriptions');
    }
  },

  /**
   * Revoke a prescription
   * @param {string} prescriptionHash - Prescription hash string
   */
  async revokePrescription(prescriptionHash) {
    try {
      const accounts = await web3.eth.getAccounts();
      //const bytes32Hash = toBytes32(prescriptionHash);
      const bytes32Hash = prescriptionHash;
      
      const tx = await this.instance.revokePrescription(bytes32Hash, { 
        from: accounts[0] 
      });
      
      return {
        txHash: tx.tx,
        prescriptionHash: bytes32Hash
      };
    } catch (error) {
      console.error("Revoke prescription error:", error);
      throw new Error('Failed to revoke prescription');
    }
  },

  /**
   * Get prescription details
   * @param {string} prescriptionHash - Prescription hash string
   */
  async getPrescriptionDetails(prescriptionHash) {
    try {
      //const bytes32Hash = toBytes32(prescriptionHash);
      const bytes32Hash = prescriptionHash;
      const details = await this.instance.getPrescriptionDetails(bytes32Hash);
      
      return {
        prescriptionHash: fromBytes32(bytes32Hash),
        timestamp: new Date(details.timestamp * 1000),
        prescriber: details.prescriber,
        isRevoked: details.isRevoked
      };
    } catch (error) {
      console.error("Get details error:", error);
      throw new Error('Failed to get prescription details');
    }
  },

  /**
   * Check prescriber authorization
   * @param {string} address - Ethereum address
   */
  async isAuthorized(address) {
    try {
      return await this.instance.authorizedPrescribers(address);
    } catch (error) {
      console.error("Authorization check error:", error);
      throw new Error('Failed to check authorization');
    }
  },

  /**
   * Add authorized prescriber (owner only)
   * @param {string} address - Ethereum address
   */
  async addAuthorizedPrescriber(address) {
    try {
      const accounts = await web3.eth.getAccounts();
      const tx = await this.instance.addAuthorizedPrescriber(address, { 
        from: accounts[0] 
      });
      return { txHash: tx.tx };
    } catch (error) {
      console.error("Add prescriber error:", error);
      throw new Error('Failed to add authorized prescriber');
    }
  }
};



// Initialize contract on startup
contractService.init();

// Cleanup
process.on('exit', () => provider.engine.stop());

module.exports = contractService;