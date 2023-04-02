# EVMBridge-client
This project is like an interface for the [EVMBridge](https://github.com/joYyHack/EVMBridge) project. It visualizes all functions of the Bridge smart contract.

## Notes
### Deposit
* User can deposit ERC20 or ERC20 Permit tokens (that also implements ERC165) to the bridge.
* User can not deposit wrapped token(if wrapped token was issued by this bridge).

### Claim
* After deposit user can claim wrapped tokens on the target chain.
* User has to manually switch to the desired chain, and the press claim on the claim tab.
* If user deposited standart erc20 token than the same wrapped token is minted on the target chain. If user deposited ERC20 token with permit than the respective token is minted.

### Burn
* User can burn only wrapped tokens.
* Burn is available only if the tokens were claimed.
* When user burns tokens it means that they can be again claimed on the target chain or can released on the source chain.

### Release
* User can release only source tokens.
* Release is avaiable only if tokens weren't claimed after deposit, or were burnt after claim.

## Instalation
> In order to run EVMBridge-client, the validator from the [EVMBridge-validator project](https://github.com/joYyHack/EVMBridge-validator) must be run before 

> Install dependencies
```bash
git clone https://github.com/joYyHack/EVMBridge-client.git
npm install
```
> In the package.json specify the proxy field
```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "proxy": "http://localhost:8000"
}
```

> Run
>
```bash
npm start
```
