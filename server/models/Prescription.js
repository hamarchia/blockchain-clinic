const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  medicines: [String],
  issuedAt: { type: Date, default: Date.now },
  prescriptionHash: String 
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
