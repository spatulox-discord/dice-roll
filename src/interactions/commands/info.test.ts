import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {buildInfoContainer} from "./info";
import {containerTexts} from "../../test/components";

describe("buildInfoContainer", () => {
    it("stays within Discord's Components V2 text limit", () => {
        const texts = containerTexts(buildInfoContainer());
        const total = texts.reduce((sum, text) => sum + text.length, 0);
        assert.ok(texts.length > 0);
        assert.ok(total <= 4000, `${total} characters`);
    });

    it("explains every filter", () => {
        const text = containerTexts(buildInfoContainer()).join("\n");
        for (const rule of ["kh", "kl", "dh", "dl"]) {
            assert.ok(text.includes(`\`${rule}\``), `${rule} is not explained`);
        }
    });
});
