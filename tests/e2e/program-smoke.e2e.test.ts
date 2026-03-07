import { assert } from "chai";
import { confirmTx } from "../helpers/tx";
import { program, provider } from "../helpers/workspace";

describe("e2e: cpmm program smoke", () => {
    it("executes initialize end-to-end via anchor client", async () => {
        const signature = await program.methods.initialize().rpc();
        await confirmTx(provider, signature);

        const tx = await provider.connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });

        assert.isNotNull(tx);
    });
});

