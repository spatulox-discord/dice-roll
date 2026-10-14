import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ComponentType} from "discord.js";
import {parseFormula} from "./parser";
import {RollResult, rollFormula} from "./roller";
import {buildFiltersText, buildRollContainer, buildRollTable, FILTER_FIELD_NAME, TEXT_MAX_LENGTH} from "./format";
import {containerTexts, fakeUser} from "../test/components";

function rollWith(input: string, values: number[]) {
    let index = 0;
    return rollFormula(parseFormula(input), () => values[index++]!);
}

function table(input: string, ...values: number[]): string {
    return buildRollTable(rollWith(input, values));
}

describe("buildRollTable", () => {
    it("draws a single dice term with its sum", () => {
        assert.equal(table("5d6", 1, 2, 4, 2, 4), [
            "╔══════════════════╗",
            "║       5d6        ║",
            "╠═══════════╤══════╣",
            "║   rolls   │ sum  ║",
            "╟───────────┼──────╢",
            "║ 1 2 4 2 4 │ [13] ║",
            "╚═══════════╧══════╝"
        ].join("\n"));
    });

    it("adds a dice column, a mod row and a total row with several terms", () => {
        assert.equal(table("2d20kh1+1d4+3", 15, 7, 3), [
            "╔══════════════════════╗",
            "║    2d20kh1+1d4+3     ║",
            "╠══════╤════════╤══════╣",
            "║ dice │ rolls  │ sum  ║",
            "╟──────┼────────┼──────╢",
            "║ 2d20 │ 15 (7) │ [15] ║",
            "║ +1d4 │ 3      │ [3]  ║",
            "║ mod  │        │  +3  ║",
            "╟──────┴────────┼──────╢",
            "║ total         │ [21] ║",
            "╚═══════════════╧══════╝"
        ].join("\n"));
    });

    it("adds a total row to a single term with a modifier", () => {
        const lines = table("4d6kh3+2", 2, 6, 1, 5).split("\n");
        assert.equal(lines[5], "║ 2 6 (1) 5 │ [13] ║");
        assert.equal(lines[6], "║ mod       │  +2  ║");
        assert.equal(lines[8], "║ total     │ [15] ║");
    });

    it("shows the successes with the total of their faces", () => {
        const lines = table("4d6<=3", 1, 5, 3, 2).split("\n");
        assert.equal(lines[3], "║   rolls   │   successes   ║");
        assert.equal(lines[5], "║ 1 (5) 3 2 │ [3] total = 6 ║");
    });

    it("titles the sum column result when sums and successes are mixed", () => {
        assert.match(table("1d20+4d6<=3", 12, 1, 5, 3, 2), /│ +result +║/);
    });

    it("keeps the sign of negative terms", () => {
        const output = table("1d20-1d6", 12, 4);
        assert.match(output, /║ -1d6 │ 4 +│ +\[-4\] +║/);
        assert.match(output, /║ total +│ +\[8\] +║/);
    });

    it("wraps long rolls over several lines", () => {
        const lines = table("12d6", 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6).split("\n");
        assert.equal(lines[5], "║ 1 2 3 4 5 6 1 2 3 4 │ [42] ║");
        assert.equal(lines[6], "║ 5 6                 │      ║");
    });

    it("widens the table for a long formula", () => {
        const lines = table("1d4+1d4+1d4", 1, 2, 3).split("\n");
        assert.ok(lines.every(line => line.length === lines[0]!.length), "all lines have the same width");
        assert.match(lines[1]!, /1d4\+1d4\+1d4/);
    });

    it("can hide the rolls", () => {
        assert.match(buildRollTable(rollWith("5d6", [1, 2, 4, 2, 4]), true), /║ … +│ \[13\] ║/);
    });
});

describe("buildFiltersText", () => {
    it("is absent without filter", () => {
        assert.equal(buildFiltersText(rollWith("3d6+2", [1, 2, 3])), null);
    });

    it("describes each filter, then the legend", () => {
        assert.equal(buildFiltersText(rollWith("2d20kh1+4d6dl1+4d6kl3", [15, 7, 3, 1, 4, 6, 2, 6, 1, 5])), [
            "`2d20kh1` keeps the highest die",
            "`4d6dl1` drops the lowest die",
            "`4d6kl3` keeps the 3 lowest dice",
            "-# (n) = not counted"
        ].join("\n"));
    });

    it("gives the successes and the total of their faces", () => {
        assert.equal(buildFiltersText(rollWith("4d6<=3", [1, 5, 3, 2])),
            "`4d6<=3` counts dice ≤ 3 as successes: 3 successes (total = 6)\n-# (n) = not counted");
        assert.match(buildFiltersText(rollWith("2d6=6", [6, 1]))!, /: 1 success \(total = 6\)/);
    });
});

describe("buildRollContainer", () => {
    function build(result: RollResult, isPrivate = false) {
        const container = buildRollContainer(result, fakeUser, isPrivate);
        return {json: JSON.stringify(container.toJSON()), texts: containerTexts(container), container};
    }

    it("shows who rolled, the table, the filters and the reroll button, in this order", () => {
        const {texts, container} = build(rollWith("2d20kh1", [15, 7]));

        assert.match(texts[0]!, /^-# 🎲 Rolled by \*\*Testeur\\_\\\*du\\\*\\_dé\*\*$/);
        assert.ok(texts[1]!.startsWith("```\n╔"));
        assert.equal(texts[2], `__**${FILTER_FIELD_NAME}**__`);
        assert.ok(texts[3]!.startsWith("`2d20kh1` keeps the highest die"));

        const components = container.toJSON().components;
        const row = components[components.length - 1]!;
        assert.equal(row.type, ComponentType.ActionRow);
        const button = row.type === ComponentType.ActionRow ? row.components[0] : undefined;
        assert.equal(button && "custom_id" in button ? button.custom_id : null, "dice_reroll|s|2d20kh1");
    });

    it("has no filters section without filter", () => {
        assert.doesNotMatch(build(rollWith("3d6", [1, 2, 3])).json, /Filters|not counted/);
    });

    it("carries the visibility in the reroll button", () => {
        assert.match(build(rollWith("1d20", [3]), true).json, /dice_reroll\|p\|1d20/);
    });

    it("hides the rolls, not the sums, when they do not fit in Discord's text limit", () => {
        // 200 dice showing 1000, almost all between parentheses : the biggest table the limits allow
        const result = rollWith("100d1000kh1+100d1000<2", Array.from({length: 200}, () => 1000));
        assert.ok(buildRollTable(result).length > TEXT_MAX_LENGTH, "the full table must not fit");

        const {texts} = build(result);
        const total = texts.reduce((sum, text) => sum + text.length, 0);
        assert.ok(total <= TEXT_MAX_LENGTH, `${total} characters`);

        const tableText = texts.find(text => text.startsWith("```\n╔"));
        assert.ok(tableText, "the table must always be there");
        assert.match(tableText, /│ … +│ +\[1000\] +║/);
    });

    it("keeps every die when the table fits", () => {
        const result = rollWith("100d999kh1+100d999<2", Array.from({length: 200}, () => 999));
        assert.doesNotMatch(build(result).json, /│ … /);
    });
});
