const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  blockchainPatientId: { type: String}, // Store the bytes32 value here
  name: String,
  age: Number,
  address: String
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
