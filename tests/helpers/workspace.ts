import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Cpmm } from "../../target/types/cpmm";

type TestProvider = anchor.AnchorProvider & {
  wallet: anchor.Wallet & { payer: web3.Keypair };
};

export const provider = anchor.AnchorProvider.env() as TestProvider;
anchor.setProvider(provider);

export const payer = provider.wallet.payer;
export const program = anchor.workspace.cpmm as Program<Cpmm>;