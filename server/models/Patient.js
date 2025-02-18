const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  address: String
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
