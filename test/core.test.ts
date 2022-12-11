import Fuji, { RegtestAssets, toSatoshis, Oracles } from '../src/index';
import fixtures from './fixtures/fixtures.json';

jest.setTimeout(20000);

const elementsCoreEndpoint = 'http://admin1:123@localhost:18884';
const factoryEndpoint = 'http://fuji-factory.local';

describe('Fuji', () => {
  // create a new instance of Fuji connected to Elements Core wallet
  const fuji = new Fuji({
    asset: RegtestAssets.FUSD,
    collateral: RegtestAssets.LBTC,
    elementsCoreEndpoint,
    factoryEndpoint,
    options: {
      broadcast: false,     
    }
  });


  jest.spyOn(fuji.factory, 'ping')
    .mockImplementation(
      async () => Promise.resolve(true)
    );

  jest.spyOn(fuji.factory, 'preview')
    .mockImplementation(
      async () => Promise.resolve(fixtures.borrow.preview)
    );

  jest.spyOn(fuji.factory, 'proposeContract')
    .mockImplementation(
      async () => Promise.resolve(fixtures.borrow.proposeContract)
    );

  // restore the spy created with spyOn
  //jest.restoreAllMocks();

  it('borrow fuji assets', async () => {
    try {
      // pick one or more of the available oracles using the name.
      // It could be Oracles.Bitfinex or Oracles.Kraken
      const oracles = [Oracles.FujiMoney];

      // borrow 500 FUSD at 180% collateral ratio
      const { hex } = await fuji.borrow({
        amount: toSatoshis(500),
        collateralRatio: 180,
        oracles,
      });

      expect(hex).toBeDefined();
    } catch (error) {
      console.error(error);
    }

    return;
  });
});
