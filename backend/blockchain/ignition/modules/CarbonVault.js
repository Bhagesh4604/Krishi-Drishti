const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CarbonVaultModule", (m) => {
  const vault = m.contract("CarbonVault");
  return { vault };
});
