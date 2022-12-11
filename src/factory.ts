import axios from 'axios';

export type ProposeContractParams = {
  partialTransaction: string;
  borrowerAddress: string;
  collateralAmount: number;
  collateralAsset: string;
  contractParams: ContractParams;
  attestation?: {
    signature: string;
    message: string;
    messageHash: string;
  };
  covenantOutputIndexInTransaction: number;
  blindersOfCollateralInputs?: {
    index: number;
    value: string; // number
    asset: string; // base64
    assetBlindingFactor: string; // base64
    valueBlindingFactor: string; // base64
  }[];
};

export type ContractParams = {
  // contract constructor
  borrowAsset: string;
  borrowAmount: number;
  issuerPublicKey: string;
  borrowerPublicKey: string;
  oraclePublicKey: string;
  priceLevel: string; // base64
  setupTimestamp: string; // base64
};

export class Factory {
  constructor(private endpoint: string = 'https://factory.fuji.money') {}

  async preview(
    amount: number,
    asset: string,
    oracleXOnlyPubKey: string,
    borrowerXOnlyPubKey: string
  ): Promise<{ contractAddress: string; contractParams: ContractParams }> {
    try {
      // Get contract compiled from factory's /preview endpoint
      const {
        data: { address: contractAddress, contractParams },
      } = await axios.get(`
        ${this.endpoint}/preview?${new URLSearchParams({
        amount: amount.toString(),
        asset: asset,
        oracle: oracleXOnlyPubKey,
        borrower: borrowerXOnlyPubKey,
      }).toString()}
      `);
      return { contractAddress, contractParams };
    } catch (error) {
      if (error && error.hasOwnProperty('isAxiosError')) {
        throw new Error((error as any).response.data.error);
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Unknown error');
    }
  }

  async proposeContract(
    params: ProposeContractParams
  ): Promise<{ partialTransaction: string }> {
    try {
      const response = await axios.post(`${this.endpoint}/contracts`, params, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status !== 200) {
        throw new Error(response.data);
      }

      return { partialTransaction: response.data.partialTransaction };
    } catch (error) {
      if (
        error &&
        error.hasOwnProperty('isAxiosError') &&
        error.hasOwnProperty('response')
      ) {
        if (typeof (error as any).response.data === 'string') {
          throw new Error((error as any).response.data);
        }
        throw new Error((error as any).response.data.error);
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Unknown error');
    }
  }
}
