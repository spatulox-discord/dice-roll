import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {buildInfoEmbed} from "./info";

describe("buildInfoEmbed", () => {
    it("stays within Discord's embed limits", () => {
        const embed = buildInfoEmbed().toJSON();
        const fields = embed.fields ?? [];

        assert.ok(fields.length > 0);
        for (const field of fields) {
            assert.ok(field.name.length <= 256, `field name too long : ${field.name}`);
            assert.ok(field.value.length <= 1024, `field "${field.name}" is ${field.value.length} characters long`);
        }

        const total = (embed.title?.length ?? 0) + (embed.description?.length ?? 0)
            + fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0)
            + (embed.footer?.text.length ?? 0);
        assert.ok(total <= 6000, `embed is ${total} characters long`);
    });

    it("explains every keep / drop rule", () => {
        const text = JSON.stringify(buildInfoEmbed().toJSON());
        for (const rule of ["kh", "kl", "dh", "dl"]) {
            assert.ok(text.includes(`\`${rule}\``), `${rule} is not explained`);
        }
    });
});
