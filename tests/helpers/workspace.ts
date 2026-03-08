import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Cpmm } from "../../target/types/cpmm";

const idl = require("../../target/idl/cpmm.json") as Cpmm;

type TestProvider = LiteSVMProvider & {
  wallet: anchor.Wallet & { payer: web3.Keypair };
};

const client = fromWorkspace(".");
export const provider = new LiteSVMProvider(client) as TestProvider;
anchor.setProvider(provider);

export const payer = provider.wallet.payer;
export const program = new Program<Cpmm>(idl, provider);