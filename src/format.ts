import Decimal from 'decimal.js';

export function toSatoshis(fractional: number, precision: number = 8): number {
  return Decimal.floor(
    new Decimal(fractional).mul(Decimal.pow(10, precision))
  ).toNumber();
}

export function fromSatoshis(
  integer: number = 0,
  precision: number = 8
): number {
  return new Decimal(integer).div(Decimal.pow(10, precision)).toNumber();
}

export function collateralFromRatio(
  satoshis: number,
  collateralRatio: number,
  price: number
) {
  const value = Decimal.mul(fromSatoshis(satoshis), collateralRatio).div(price);
  return toSatoshis(value.toNumber());
}
