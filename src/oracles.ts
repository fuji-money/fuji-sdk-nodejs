import axios from 'axios';

export type CurrencyPair = string;
export interface LastPriceAttestationResponse {
  signature: string;
  price: number;
}

export interface OracleInterface {
  XOnlyPublicKey: Buffer;
  lastPriceAttestation(pair: string): Promise<LastPriceAttestationResponse>;
}

export enum Oracles {
  FujiMoney = '@fuji/btc-usd',
  Bitfinex = '@bitfinex/btc-usd',
  Blockstream = '@blockstream/btc-usd',
  Synonym = '@synonym/btc-usd',
}

export function OracleFactory(name: string): OracleInterface {
  switch (name) {
    case Oracles.FujiMoney:
      return new FujiOracle({
        publicKey: Buffer.from(
          'c304c3b5805eecff054c319c545dc6ac2ad44eb70f79dd9570e284c5a62c0f9e',
          'hex'
        ),
        endpoints: {
          'BTC/USD': 'https://oracle.fuji.money/oracle/BTCUSD',
        },
      });
    default:
      throw new Error(
        'Oracle not available this time. It can be temporarily down or not supported yet for this network.'
      );
  }
}

export async function oracleWithHigestPrice(
  oracleNames: string[]
): Promise<{
  price: number;
  signature: string;
  oraclePublicKey: Buffer;
}> {
  const oracles = oracleNames.map(name => OracleFactory(name));
  const attestations = await Promise.all(
    oracles.map(async oracle => {
      const attestation = await oracle.lastPriceAttestation('BTC/USD');
      return { ...attestation, oraclePublicKey: oracle.XOnlyPublicKey };
    })
  );

  const attestationWithHighestPrice = attestations.reduce(
    (highest, current) => {
      if (current.price > highest.price) {
        return current;
      }
      return highest;
    }
  );

  return {
    price: attestationWithHighestPrice.price,
    signature: attestationWithHighestPrice.signature,
    oraclePublicKey: attestationWithHighestPrice.oraclePublicKey,
  };
}

export class FujiOracle implements OracleInterface {
  public endpoints: Record<CurrencyPair, string>;
  public XOnlyPublicKey: Buffer;

  constructor({
    publicKey,
    endpoints,
  }: {
    publicKey: Buffer;
    endpoints: Record<string, string>;
  }) {
    if (!publicKey) {
      throw new Error('Public key is required');
    }

    const isXOnly = publicKey.length === 32;
    this.XOnlyPublicKey = isXOnly ? publicKey : publicKey.subarray(1);
    this.endpoints = endpoints;
  }

  getPublicKey(): { XOnlyPublicKey: Buffer } {
    return {
      XOnlyPublicKey: this.XOnlyPublicKey,
    };
  }

  async lastPriceAttestation(
    pair: CurrencyPair = 'BTC/USD'
  ): Promise<LastPriceAttestationResponse> {
    const response = await axios.get(this.endpoints[pair]);
    if (response.status !== 200) {
      throw new Error(`Oracle returned ${response.status} status code`);
    }

    const {
      attestation: { signature },
      lastPrice,
    } = response.data;

    return {
      signature,
      price: Number(lastPrice),
    };
  }
}
