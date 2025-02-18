const { expect } = require('chai');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const PrescriptionRegistry = artifacts.require('PrescriptionRegistry');

contract('PrescriptionRegistry', (accounts) => {
  const [owner, prescriber, unauthorized, patient] = accounts;
  const patientId = web3.utils.keccak256('patient-123');
  const prescriptionHash = web3.utils.keccak256('prescription-data');
  const emptyBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

  let registry;

  beforeEach(async () => {
    registry = await PrescriptionRegistry.new({ from: owner });
    await registry.addAuthorizedPrescriber(prescriber, { from: owner });
  });

  describe('Deployment', () => {
    it('should set the correct owner', async () => {
      expect(await registry.owner()).to.equal(owner);
    });

    it('should initialize authorized prescribers', async () => {
      expect(await registry.authorizedPrescribers(owner)).to.be.true;
      expect(await registry.authorizedPrescribers(prescriber)).to.be.true;
    });
  });

  describe('Adding Prescriptions', () => {
    it('should allow authorized prescriber to add prescription', async () => {
      const tx = await registry.addPrescription(
        patientId,
        prescriptionHash,
        { from: prescriber }
      );

      // Test event emission
      expectEvent(tx, 'PrescriptionAdded', {
        prescriptionHash,
        patientId,
        prescriber
      });

      // Verify storage
      const prescription = await registry.prescriptions(prescriptionHash);
      expect(prescription.timestamp).to.be.a('number');
      expect(prescription.prescriber).to.equal(prescriber);

      // Check patient mapping
      const scripts = await registry.getPatientPrescriptions(patientId);
      expect(scripts).to.include(prescriptionHash);
    });

    it('should prevent unauthorized users from adding prescriptions', async () => {
      await expectRevert(
        registry.addPrescription(patientId, prescriptionHash, { from: unauthorized }),
        'Unauthorized'
      );
    });

    it('should prevent duplicate prescriptions', async () => {
      await registry.addPrescription(patientId, prescriptionHash, { from: prescriber });
      
      await expectRevert(
        registry.addPrescription(patientId, prescriptionHash, { from: prescriber }),
        'Prescription already exists'
      );
    });

    it('should reject invalid hashes', async () => {
      await expectRevert(
        registry.addPrescription(patientId, emptyBytes32, { from: prescriber }),
        'Invalid hash'
      );
    });
  });

  describe('Verification', () => {
    beforeEach(async () => {
      await registry.addPrescription(patientId, prescriptionHash, { from: prescriber });
    });

    it('should verify valid prescriptions', async () => {
      const isValid = await registry.verifyPrescription(patientId, prescriptionHash);
      expect(isValid).to.be.true;
    });

    it('should reject invalid prescriptions', async () => {
      const invalidHash = web3.utils.keccak256('invalid-data');
      const isValid = await registry.verifyPrescription(patientId, invalidHash);
      expect(isValid).to.be.false;
    });

    it('should reject mismatched patient-prescription', async () => {
      const otherPatient = web3.utils.keccak256('patient-456');
      const isValid = await registry.verifyPrescription(otherPatient, prescriptionHash);
      expect(isValid).to.be.false;
    });
  });

  describe('Patient Prescriptions', () => {
    it('should return all prescriptions for a patient', async () => {
      const hash1 = web3.utils.keccak256('script1');
      const hash2 = web3.utils.keccak256('script2');

      await registry.addPrescription(patientId, hash1, { from: prescriber });
      await registry.addPrescription(patientId, hash2, { from: prescriber });

      const scripts = await registry.getPatientPrescriptions(patientId);
      expect(scripts.length).to.equal(2);
      expect(scripts).to.include(hash1);
      expect(scripts).to.include(hash2);
    });

    it('should return empty array for new patients', async () => {
      const newPatient = web3.utils.keccak256('new-patient');
      const scripts = await registry.getPatientPrescriptions(newPatient);
      expect(scripts.length).to.equal(0);
    });
  });

  describe('Authorization Management', () => {
    it('should allow owner to add prescribers', async () => {
      await registry.addAuthorizedPrescriber(unauthorized, { from: owner });
      expect(await registry.authorizedPrescribers(unauthorized)).to.be.true;
    });

    it('should prevent non-owners from adding prescribers', async () => {
      await expectRevert(
        registry.addAuthorizedPrescriber(unauthorized, { from: prescriber }),
        'Only owner'
      );
    });
  });
});