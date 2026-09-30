import os
import json
from web3 import Web3

# Connect to local Hardhat node
WEB3_PROVIDER_URI = os.getenv("WEB3_PROVIDER_URI", "http://127.0.0.1:8545")
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URI))

# Hardhat's default Account #0 private key
ADMIN_PRIVATE_KEY = os.getenv(
    "ADMIN_PRIVATE_KEY",
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
)

# In a real app, this address comes from the deployment script
# For now, we will store it in the .env or read it from a local file.
# If not deployed yet, this service will just skip silently or log an error.
CARBON_VAULT_ADDRESS = os.getenv("CARBON_VAULT_ADDRESS", None)

def get_contract():
    if not CARBON_VAULT_ADDRESS:
        return None
    
    # Load ABI from Hardhat artifacts
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    artifact_path = os.path.join(base_dir, "blockchain", "artifacts", "contracts", "CarbonVault.sol", "CarbonVault.json")
    
    if not os.path.exists(artifact_path):
        return None
        
    with open(artifact_path, "r") as f:
        artifact = json.load(f)
        
    abi = artifact.get("abi")
    return w3.eth.contract(address=CARBON_VAULT_ADDRESS, abi=abi)

def anchor_evidence_to_blockchain(evidence_id: int, project_id: int, evidence_hash: str) -> str:
    """
    Submits the evidence hash to the CarbonVault smart contract.
    Returns the transaction hash.
    """
    if not w3.is_connected():
        print("Web3 not connected. Skipping blockchain anchor.")
        return None

    contract = get_contract()
    if not contract:
        print("Contract not configured or deployed. Skipping blockchain anchor.")
        return None

    account = w3.eth.account.from_key(ADMIN_PRIVATE_KEY)
    
    # Build transaction
    try:
        nonce = w3.eth.get_transaction_count(account.address)
        tx = contract.functions.logEvidence(evidence_id, project_id, evidence_hash).build_transaction({
            "chainId": 31337,
            "gas": 3000000,
            "gasPrice": w3.eth.gas_price,
            "nonce": nonce,
        })
        
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=ADMIN_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction) # type: ignore
        
        # Wait for receipt
        w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return tx_hash.hex()
    except Exception as e:
        print(f"Blockchain anchoring failed: {e}")
        return None
