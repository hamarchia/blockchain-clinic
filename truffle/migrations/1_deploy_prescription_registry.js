const PrescriptionRegistry = artifacts.require("PrescriptionRegistry");

module.exports = function(deployer) {
  deployer.deploy(PrescriptionRegistry);
};
