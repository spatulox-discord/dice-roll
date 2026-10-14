import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {APIButtonComponentWithCustomId, ButtonStyle, ComponentType} from "discord.js";
import {buildInfoContainer, INFO_PAGES, parseInfoPageId} from "./info";
import {containerTexts} from "../../test/components";

function buttonsOf(pageId?: string): APIButtonComponentWithCustomId[] {
    return buildInfoContainer(pageId).toJSON().components
        .filter(component => component.type === ComponentType.ActionRow)
        .flatMap(row => row.type === ComponentType.ActionRow ? row.components : [])
        .filter((component): component is APIButtonComponentWithCustomId => component.type === ComponentType.Button && "custom_id" in component);
}

describe("buildInfoContainer", () => {
    it("stays within Discord's Components V2 text limit on every page", () => {
        for (const page of INFO_PAGES) {
            const total = containerTexts(buildInfoContainer(page.id)).reduce((sum, text) => sum + text.length, 0);
            assert.ok(total <= 4000, `${page.id}: ${total} characters`);
        }
    });

    it("shows the first page by default and for an unknown page", () => {
        const first = INFO_PAGES[0]!;
        assert.match(containerTexts(buildInfoContainer()).join("\n"), new RegExp(`### ${first.emoji} ${first.label}`));
        assert.deepEqual(containerTexts(buildInfoContainer("nope")), containerTexts(buildInfoContainer()));
    });

    it("has a button per page, at most 3 per row, the current one highlighted and disabled", () => {
        const rows = buildInfoContainer("target").toJSON().components.filter(component => component.type === ComponentType.ActionRow);
        assert.ok(rows.every(row => row.type === ComponentType.ActionRow && row.components.length <= 3));

        const buttons = buttonsOf("target");
        assert.deepEqual(buttons.map(button => button.custom_id), INFO_PAGES.map(page => `info_page|${page.id}`));
        for (const button of buttons) {
            const current = button.custom_id === "info_page|target";
            assert.equal(button.style, current ? ButtonStyle.Primary : ButtonStyle.Secondary);
            assert.equal(button.disabled ?? false, current);
        }
    });

    it("explains every filter and the target", () => {
        const filters = containerTexts(buildInfoContainer("filters")).join("\n");
        for (const rule of ["kh", "kl", "dh", "dl", "<=", ">="]) {
            assert.ok(filters.includes(`\`${rule}\``), `${rule} is not explained`);
        }
        assert.match(containerTexts(buildInfoContainer("target")).join("\n"), /`2d6\+3 vs 8`/);
    });
});

describe("parseInfoPageId", () => {
    it("reads the page of a button", () => {
        assert.equal(parseInfoPageId("info_page|limits"), "limits");
        assert.equal(parseInfoPageId("dice_reroll|s|1d20"), null);
        assert.equal(parseInfoPageId("info_page"), null);
    });
});
