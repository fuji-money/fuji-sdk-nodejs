import Fuji, { RegtestAssets, toSatoshis, Oracles } from '../src/index';

jest.setTimeout(20000);

const elementsCoreEndpoint = 'http://admin1:123@localhost:18884';
const factoryEndpoint = 'http://localhost:8000';

describe('Fuji', () => {
  it('borrow fuji assets', async () => {
    try {
      // create a new instance of Fuji connected to Elements Core wallet
      const fuji = new Fuji({
        asset: RegtestAssets.FUSD,
        collateral: RegtestAssets.LBTC,
        elementsCoreEndpoint,
        factoryEndpoint,
      });

      // pick one or more of the available oracles using the name.
      // It could be Oracles.Bitfinex or Oracles.Kraken
      const oracles = [Oracles.FujiMoney];

      // borrow 500 FUSD at 180% collateral ratio
      const txid = await fuji.borrow({
        amount: toSatoshis(500),
        collateralRatio: 180,
        oracles,
      });

      expect(txid).toBeTruthy();
      expect(txid).toHaveLength(64);
    } catch (error) {
      console.error(error);
    }

    return;
  });
});
