async function main() {
  const CarbonVault = await ethers.getContractFactory("CarbonVault");
  const vault = await CarbonVault.deploy();
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  
  console.log("CarbonVault deployed to:", address);
  
  // Write the address to a file so the Python backend can read it
  const fs = require("fs");
  const path = require("path");
  const envLine = `CARBON_VAULT_ADDRESS=${address}\n`;
  const envPath = path.join(__dirname, "..", "..", "..", ".env");
  
  // Append or update CARBON_VAULT_ADDRESS in root .env
  let envContent = "";
  try { envContent = fs.readFileSync(envPath, "utf-8"); } catch(e) {}
  
  if (envContent.includes("CARBON_VAULT_ADDRESS=")) {
    envContent = envContent.replace(/CARBON_VAULT_ADDRESS=.*/g, `CARBON_VAULT_ADDRESS=${address}`);
  } else {
    envContent += `\n# Blockchain (Hardhat Local)\nCARBON_VAULT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env with CARBON_VAULT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
