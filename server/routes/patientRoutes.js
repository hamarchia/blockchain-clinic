const express = require('express');
const Patient = require('../models/Patient');

const router = express.Router();

router.post('/add', async (req, res) => {
  try {
    const newPatient = new Patient(req.body);
    await newPatient.save();
    res.json({ success: true, message: "Patient added successfully!", patientId: newPatient._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
