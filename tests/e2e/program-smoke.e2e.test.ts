import { assert } from "chai";
import { program } from "../helpers/workspace";

describe("e2e: cpmm program smoke", () => {
    it("executes initialize against litesvm", async () => {
        const signature = await program.methods.initialize().rpc();
        assert.isString(signature);
        assert.isAbove(signature.length, 20);
    });
});
