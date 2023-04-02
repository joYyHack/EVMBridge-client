# EVMBridge-client
The EVMBridge-client is an interface for theEVMBridge Contract smart contract](https://github.com/joYyHack/EVMBridge), allowing users to deposit ERC20 or ERC20 Permit tokens to the bridge, claim wrapped tokens on the target chain, burn wrapped tokens, and release source tokens.

## Functionality
### Deposit
Users can deposit ERC20 or ERC20 Permit tokens (that also implement ERC165) to the bridge. Deposits of wrapped tokens issued by the same bridge are not allowed.

### Claim
After deposit, users can claim wrapped tokens on the target chain. To do so, they must manually switch to the desired chain and click "Claim" on the claim tab. If the user deposited a standard ERC20 token, the same wrapped token will be minted on the target chain. If the user deposited an ERC20 token with permit, the corresponding token will be minted instead.

### Burn
Users can burn only wrapped tokens. Burning is available only if the tokens were claimed. When users burn tokens, they can be claimed again on the target chain or released on the source chain.

### Release
Users can release only source tokens. Release is available only if tokens were not claimed after deposit or were burned after claiming.

## Instalation
To run the EVMBridge-client, the validator from the [EVMBridge-validator project](https://github.com/joYyHack/EVMBridge-validator) must be run first 

1. Clone the repository:
```bash
git clone https://github.com/joYyHack/EVMBridge-client.git
```
2. Install dependencies:
```bash
npm install
```
3. In the package.json file, specify the proxy field:
```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "proxy": "http://localhost:8000"
}
```

4. Run the app:

```bash
npm start
```
## Known issues
* If something seems to be working incorrectly, try to refresh the page.
* Sometimes the 'switch network' button does not respond when clicked. If this happens, please try refreshing the page.
