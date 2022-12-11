# 🌋Fuji SDK for Node.js

The Fuji SDK provides an easy way to integrate Fuji in your Node.js apps, a decentralized stablecoin protocol, that combines Liquid and Lightning Network.

It assumes you have an Elements Node running you can connect to be used as wallet for collateral funding and storing the Fuji assets you borrow.


## 📚Usage Documentation

To use the Fuji SDK, you will need to install it using yarn or npm:

```sh
yarn add fuji-sdk

# or wit npm
npm install fuji-sdk
```


Here is an example of how to use the SDK to borrow fuji assets in Testnet:

```ts
import { Fuji, Oracles, TestnetAssets } from 'fuji-sdk';
      
// create a new instance of Fuji connected to Elements Core wallet
const fuji = new Fuji({
  asset: TestnetAssets.FUSD,
  collateral: TestnetAssets.LBTC,
  elementsCoreEndpoint,
  factoryEndpoint,
});

// pick one or more of the available oracles using the name.
// It could be Oracles.Bitfinex or Oracles.Kraken 
const oracles = [ Oracles.FujiMoney ];

// borrow 500 FUSD at 180% collateral ratio
const txid = await fuji.borrow({
  amount: toSatoshis(500),
  collateralRatio: 180,
  oracles,
});


console.log(txid); // "4a4f3cc9b9f70bce08bdbfa3bac3e7c7d1a83a65b7a2b847b9f5d51a22edf731"
```

## 👨‍💻Developer Documentation

To run the project, you will need the following:

* Node.js 14 or later
* An elements node running 
* A Fuji factory backend running on port `:8000`

To install the dependencies, run the following command:

```sh
yarn install
```

To build the project, run the following command:

```sh
yarn build
```

To run the tests, you will need to have a regtest node running. You can use the [Nigiri](https://getnigiri.vulpem.com/) docker compose box to run a regtest enviroment. 

Start Nigiri 

```sh
nigiri start --liquid 
```

and then run the following command:

```sh
# issue new asset and move the token to the factory
yarn regtest

# run the tests
yarn test
```


For more information on how to use the SDK, see the [API reference](#).

## 📜 License

[MIT](./LICENSE)
