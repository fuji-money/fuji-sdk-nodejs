export interface BorrowParams {
  amount: number;
  collateralRatio: number;
  oracles: string[];
  address?: string;
}

export interface RedeemParams {
  address?: string;
}

export interface UpdateCollateralParams {
  collateralRatio: number;
}

export interface ElementsCoreParams {
  url: string;
}

export interface FujiParams {
  asset?: string;
  collateral?: string;
  pair?: string;
  factoryEndpoint?: string;
  elementsCoreEndpoint?: string;
  options?: {
    broadcast?: boolean;
  };
}

export interface FujiInterface {
  borrow({
    amount,
    collateralRatio,
    oracles,
  }: BorrowParams): Promise<{ txid?: string; hex: string }>;
  redeem({ address }: RedeemParams): Promise<any>;
  updateCollateral({ collateralRatio }: UpdateCollateralParams): Promise<any>;
}
