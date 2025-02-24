const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  prescriptionHash: { type: String, required: true }, // Store the bytes32 value here
  medicines: [String],
  issuedAt: { type: Date, default: Date.now },
  isRevoked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
