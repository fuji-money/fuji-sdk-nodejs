import Decimal from 'decimal.js';
import { RpcClient } from 'jsonrpc-ts';
import {
  AssetHash,
  Transaction,
  Pset,
  Signer,
  Updater,
  Finalizer,
  Extractor,
  TxOutput,
  address,
  script,
  networks,
} from 'liquidjs-lib';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { Assets, FEE_AMOUNT } from './constants';
import { collateralFromRatio, fromSatoshis, toSatoshis } from './format';
import { oracleWithHigestPrice } from './oracles';
import {
  BorrowParams,
  FujiInterface,
  FujiParams,
  RedeemParams,
} from './interfaces';
import { ElementsWrapper } from './elements';
import { Factory } from './factory';

const ECPair = ECPairFactory(ecc);

export default class Fuji implements FujiInterface {
  public elementsCore: ElementsWrapper;
  public factory: Factory;
  public asset: string;
  public collateral: string;
  public pair: string;
  private options: { broadcast?: boolean | undefined; };

  constructor({
    asset,
    collateral,
    pair = 'BTC/USD',
    factoryEndpoint = 'https://factory.fuji.money',
    elementsCoreEndpoint,
    options
  }: FujiParams) {
    this.asset = asset || Assets.FUSD;
    this.collateral = collateral || Assets.LBTC;
    this.pair = pair;
    this.factory = new Factory(factoryEndpoint);
    this.options = options || {};

    if (!elementsCoreEndpoint)
      throw new Error(
        'A valid Elements Core endpoint is required. Be sure to include protocol, user, password, host and port. Example: http://<user>:<password>@<host>:<port>'
      );

    const rpcClient = new RpcClient<any>({
      url: elementsCoreEndpoint,
    });
    this.elementsCore = new ElementsWrapper(rpcClient);
  }

  async borrow(borrowParams: BorrowParams): Promise<{
    txid?: string;
    hex: string;
  }> {
    if (borrowParams.amount <= 0)
      throw new Error('amount must be greater than 0');
    if (borrowParams.collateralRatio <= 0)
      throw new Error('collateralRatio must be greater than 0');
    if (
      !Array.isArray(borrowParams.oracles) ||
      borrowParams.oracles.length === 0
    )
      throw new Error('oracles must be an array with at least one oracle');

    // check if factory is ready
    const isOnline = await this.factory.ping();
    if (!isOnline) throw new Error('FUJI Factory is not online');

    // among all selected oracles, get the one with the highest price
    const { price, signature, oraclePublicKey } = await oracleWithHigestPrice(
      borrowParams.oracles
    );

    const { xonlypubkey, address: borrowerAddress } = await this.getNewAddres();

    const { contractAddress, contractParams } = await this.factory.preview(
      borrowParams.amount,
      this.asset,
      oraclePublicKey.toString('hex'),
      xonlypubkey
    );

    // Calculate collateral amount
    const collateralAmount = collateralFromRatio(
      borrowParams.amount,
      borrowParams.collateralRatio,
      price
    );
    const collateralAmountFractional = Number(
      fromSatoshis(collateralAmount).toFixed(8)
    );

    // create a psbt adding the contract output, collateral input & change output
    const { psbt, blindersOfInputs } = await this.createTx(
      contractAddress,
      collateralAmountFractional
    );

    // propose contract issuance to the factory
    const { partialTransaction } = await this.factory.proposeContract({
      attestation: {
        signature: signature,
        message: '',
        messageHash: '',
      },
      partialTransaction: psbt,
      covenantOutputIndexInTransaction: 0,
      collateralAsset: this.collateral,
      collateralAmount: collateralAmount,
      borrowerAddress: borrowerAddress,
      contractParams,
      blindersOfCollateralInputs: blindersOfInputs,
    });

    const hex = await this.signAndFinalizeTx(partialTransaction);

    if (this.options.broadcast) {
      const txid = await this.elementsCore.rpcCommand('sendrawtransaction', [
        hex,
      ]);
      return { txid, hex };
    }

    return { hex };
  }

  redeem(_redeemParams: RedeemParams): Promise<any> {
    throw new Error('Method not implemented yet.');
  }

  updateCollateral(_updateCollateralParams: any): Promise<any> {
    throw new Error('Method not implemented yet.');
  }

  private async createTx(
    contractAddress: string,
    contractAmount: number
  ): Promise<{
    psbt: string;
    blindersOfInputs: any[];
  }> {
    const { address } = await this.getNewAddres();
    const unspents = await this.elementsCore.rpcCommand('listunspent', {
      minconf: 0,
      maxconf: 9999999,
      query_options: {
        asset: this.collateral,
        minimumSumAmount: contractAmount,
      },
    });

    if (!Array.isArray(unspents) && unspents.length === 0)
      throw new Error('Not enough funds to create transaction');

    let inputs: {
      utxo: { txid: any; vout: any };
      prevout: TxOutput;
      unblindData: {
        index: number;
        asset: string;
        value: string;
        assetBlindingFactor: string;
        valueBlindingFactor: string;
      };
    }[] = [];
    let totalCoins: Decimal = new Decimal(0);

    for (let i = 0; i < unspents.length; i++) {
      const u = unspents[i];

      const { hex } = await this.elementsCore.rpcCommand('gettransaction', {
        txid: u.txid,
      });
      const tx = Transaction.fromHex(hex);
      const prevout = tx.outs[u.vout];
      totalCoins = Decimal.add(totalCoins, u.amount);
      inputs.push({
        utxo: {
          txid: u.txid,
          vout: u.vout,
        },
        prevout,
        unblindData: {
          index: i,
          asset: AssetHash.fromHex(u.asset).bytesWithoutPrefix.toString(
            'base64'
          ),
          value: toSatoshis(u.amount).toString(),
          assetBlindingFactor: Buffer.from(u.assetblinder, 'hex')
            .reverse()
            .toString('base64'),
          valueBlindingFactor: Buffer.from(u.amountblinder, 'hex')
            .reverse()
            .toString('base64'),
        },
      });
    }
    const collateralChangeAmount = totalCoins
      .sub(new Decimal(contractAmount))
      .sub(FEE_AMOUNT);

    const outputs = [
      {
        [contractAddress]: contractAmount.toString(),
        asset: this.collateral,
      },
      {
        [address]: collateralChangeAmount.toString(),
        blinder_index: 0,
        asset: this.collateral,
      },
    ];

    const psbt = await this.elementsCore.rpcCommand('createpsbt', {
      inputs: [...inputs.map(i => i.utxo)],
      outputs: [...outputs],
    });

    // we need to update the psbt with the utxo range proof & witness utxo
    const ptx = Pset.fromBase64(psbt);
    const updater = new Updater(ptx);
    ptx.inputs.forEach((_, index) => {
      updater.addInWitnessUtxo(index, inputs[index].prevout);
      updater.addInUtxoRangeProof(index, inputs[index].prevout?.rangeProof!);
      updater.addInSighashType(index, Transaction.SIGHASH_ALL);
    });

    return {
      psbt: ptx.toBase64(),
      blindersOfInputs: inputs.map((i: any) => i.unblindData),
    };
  }

  private async signAndFinalizeTx(psbt: string): Promise<string> {
    const { chain } = await this.elementsCore.rpcCommand('getblockchaininfo');

    let network = networks.liquid;
    if (chain.includes('regtest')) {
      network = networks.regtest;
    }
    if (chain.includes('testnet')) {
      network = networks.testnet;
    }

    const ptx = Pset.fromBase64(psbt);

    for (let i = 0; i < ptx.inputs.length; i++) {
      const input = ptx.inputs[i];
      const addr = address.fromOutputScript(
        input.witnessUtxo?.script!,
        network
      );
      try {
        const privKey = await this.elementsCore.rpcCommand('dumpprivkey', [
          addr,
        ]);
        const keyPair = ECPair.fromWIF(privKey, network);
        signInput(ptx, i, keyPair);
      } catch (ignore) {
        continue;
      }
    }

    const finalizer = new Finalizer(ptx);
    finalizer.finalize();

    const tx = Extractor.extract(ptx);
    const hex = tx.toHex();

    return hex;
  }

  private async getNewAddres(): Promise<{
    address: string;
    unconfidential: string;
    xonlypubkey: string;
  }> {
    const address = await this.elementsCore.rpcCommand('getnewaddress');
    const {
      pubkey,
      unconfidential,
    } = await this.elementsCore.rpcCommand('getaddressinfo', [address]);

    return { address, unconfidential, xonlypubkey: pubkey.slice(2) };
  }
}

function signInput(ptx: Pset, index: number, keyPair: ECPairInterface): Pset {
  const input = ptx.inputs[index];
  const sigHashType = input.sighashType ?? Transaction.SIGHASH_ALL;
  const preimage = ptx.getInputPreimage(index, sigHashType);

  const partialSig = {
    partialSig: {
      pubkey: keyPair.publicKey,
      signature: script.signature.encode(keyPair.sign(preimage), sigHashType),
    },
  };

  const signer = new Signer(ptx);
  signer.addSignature(index, partialSig, Pset.ECDSASigValidator(ecc));

  return ptx;
}
