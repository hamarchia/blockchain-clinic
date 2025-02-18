// contract.js
const Web3 = require("web3").default;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const contract = require("@truffle/contract");
const prescriptionRegistryArtifact = require("../build/contracts/PrescriptionRegistry.json");

const mnemonic = "joke usage myself shaft doctor visual term chair glare chunk tuition title";

let provider;
try {
  provider = new HDWalletProvider(mnemonic, "http://127.0.0.1:7545");
  console.log("Connected to Ganache successfully");
} catch (error) {
  console.error("Error connecting to Ganache:", error);
  process.exit(1);
}

const web3 = new Web3(provider);
const PrescriptionRegistry = contract(prescriptionRegistryArtifact);
PrescriptionRegistry.setProvider(web3.currentProvider);

/**
 * Adds a prescription to the blockchain.
 */
async function addPrescriptionToBlockchain(patientId, hash) {
  try {
    const accounts = await web3.eth.getAccounts();
    const instance = await PrescriptionRegistry.deployed();
    console.log("Contract deployed at:", instance.address);
    const gasEstimate = await instance.addPrescription.estimateGas(patientId, hash, { from: accounts[0] });
    console.log(`Estimated gas: ${gasEstimate}`);
    const balance = await web3.eth.getBalance(accounts[0]);
    console.log(`Sender account balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
    const sender = accounts[9] || accounts[0];
    const tx = await instance.addPrescription(patientId, hash, { from: sender, gas: gasEstimate });
    return tx.tx; // Return transaction hash
  } catch (error) {
    console.error("Error in addPrescriptionToBlockchain:", error);
    throw error;
  }
}

/**
 * Fetches all prescriptions for a given patient from the blockchain.
 */
async function getPrescriptionsFromBlockchain(patientId) {
  try {
    const registry = await PrescriptionRegistry.deployed();
    const prescriptionIds = await registry.getPrescriptionIds(patientId);
    let results = [];
    for (let id of prescriptionIds) {
      const onChainData = await registry.getPrescriptionById(id);
      results.push(onChainData);
    }
    return results;
  } catch (error) {
    console.error("Error fetching prescriptions from blockchain:", error);
    throw error;
  }
}

// Cleanup: Stop the provider engine when the process exits.
process.on("exit", () => provider.engine.stop());

module.exports = { addPrescriptionToBlockchain, getPrescriptionsFromBlockchain };
