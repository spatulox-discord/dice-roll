import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {parseFormula} from "./parser";
import {rollFormula} from "./roller";
import {ButtonStyle, ComponentType} from "discord.js";
import {
    buildFilterField,
    buildMatText,
    buildMiniMatText,
    buildRollContainer,
    buildTotalsText,
    FILTER_FIELD_NAME,
    TEXT_MAX_LENGTH
} from "./format";
import {RollResult} from "./roller";
import {containerTexts, fakeUser} from "../test/components";

function rollWith(input: string, values: number[]) {
    let index = 0;
    return rollFormula(parseFormula(input), () => values[index++]!);
}

/** The mat and the totals, then the mini mat after a blank line, as they read in Discord */
function describeRoll(input: string, ...values: number[]): string {
    const result = rollWith(input, values);
    const mini = buildMiniMatText(result);
    return `${buildMatText(result)}\n${buildTotalsText(result)}${mini ? `\n\n${mini}` : ""}`;
}

describe("game mat texts", () => {
    it("shows the mat, the dice total, the modifiers and the total", () => {
        const description = describeRoll("2d6+1d4-2", 3, 5, 4);
        assert.match(description, /^```\n2d6   \[3\] \[5\]  = 8\n\+1d4  \[4\]\n```/);
        assert.match(description, /Dice total: \*\*12\*\*/);
        assert.match(description, /Modifiers: \*\*-2\*\*/);
        assert.match(description, /# Total: 10/);
    });

    it("pads the dice to the widest die of the roll", () => {
        assert.match(describeRoll("1d20+1d4", 7, 3), /1d20  \[ 7\]\n\+1d4  \[ 3\]/);
    });

    it("hides the modifiers line and the mini mat when they are not needed", () => {
        const description = describeRoll("3d6", 4, 1, 6);
        assert.doesNotMatch(description, /Modifiers/);
        assert.doesNotMatch(description, /-#/);
    });

    it("applies the filters on the mat and shows every die on the mini mat", () => {
        const description = describeRoll("4d6kh3+2", 2, 6, 1, 5);
        const [main, mini] = description.split("\n\n");

        assert.match(main!, /4d6kh3  \[6\] \[5\]  = 11/);
        assert.doesNotMatch(main!, /\[1\]|\[2\]/);
        assert.match(main!, /# Total: 13/);

        assert.match(mini!, /-# `4d6  \[2\] \[6\] \[1\] \[5\]`/);
        assert.match(mini!, /-# Total without filter: 16/);
    });

    it("applies face value filters on the mat, even when no die matches", () => {
        const description = describeRoll("5d6k<=3+1", 6, 4, 5, 1, 3);
        assert.match(description, /5d6k<=3  \[1\] \[3\]  = 4/);
        assert.match(description, /# Total: 5/);
        assert.match(description, /-# `5d6  \[6\] \[4\] \[5\] \[1\] \[3\]`/);

        assert.match(describeRoll("2d6k>4", 1, 2), /2d6k>4  no dice\n/);
    });

    it("keeps the sign of negative dice terms", () => {
        const description = describeRoll("1d20-1d6kh1", 10, 2);
        assert.match(description, /-1d6kh1  \[ 2\]/);
        assert.match(description, /Dice total: \*\*8\*\*/);
    });
});

describe("buildFilterField", () => {
    it("is absent without keep / drop rules", () => {
        assert.equal(buildFilterField(rollWith("3d6+2", [1, 2, 3])), null);
    });

    it("lists the dice kept by kh / kl", () => {
        assert.equal(buildFilterField(rollWith("6d6kl3", [1, 5, 3, 3, 6, 2])), "`6d6kl3` keeps dice ≤ 3 → `[1] [3] [3] [2]`");
        assert.equal(buildFilterField(rollWith("4d6kh3", [2, 6, 1, 5])), "`4d6kh3` keeps dice ≥ 3 → `[6] [5]`");
    });

    it("lists the dice removed by dh / dl", () => {
        assert.equal(buildFilterField(rollWith("4d6dl2", [3, 1, 2, 6])), "`4d6dl2` removes dice ≤ 2 → `[1] [2]`");
        assert.equal(buildFilterField(rollWith("5d8dh7", [8, 2, 5, 7, 1])), "`5d8dh7` removes dice ≥ 7 → `[8] [7]`");
    });

    it("describes face value filters", () => {
        assert.equal(buildFilterField(rollWith("5d6k<=3", [6, 4, 5, 1, 3])), "`5d6k<=3` keeps dice ≤ 3 → `[1] [3]`");
        assert.equal(buildFilterField(rollWith("6d6k>=5", [5, 2, 6, 6, 1, 4])), "`6d6k>=5` keeps dice ≥ 5 → `[5] [6] [6]`");
        assert.equal(buildFilterField(rollWith("3d6k=6", [1, 2, 3])), "`3d6k=6` keeps dice = 6 → no dice");
    });

    it("has one line per filtered term", () => {
        const field = buildFilterField(rollWith("2d20kh10+1d4+4d6dl1", [3, 18, 2, 5, 1, 4, 6]));
        assert.deepEqual(field?.split("\n"), [
            "`2d20kh10` keeps dice ≥ 10 → `[18]`",
            "`4d6dl1` removes dice ≤ 1 → `[1]`"
        ]);
    });
});

describe("buildRollContainer", () => {
    function build(result: RollResult, isPrivate = false) {
        const container = buildRollContainer(result, fakeUser, isPrivate);
        return {json: JSON.stringify(container.toJSON()), texts: containerTexts(container), container};
    }

    it("shows the header, the mat, the totals and the reroll button", () => {
        const {texts, container} = build(rollWith("2d6+3", [4, 5]));

        assert.match(texts[0]!, /^### 🎲 2d6\+3\n-# Rolled by \*\*Testeur\\_\\\*du\\\*\\_dé\*\*$/);
        assert.ok(texts.some(text => text.startsWith("```\n2d6")));
        assert.ok(texts.some(text => text.includes("# Total: 12")));

        const section = container.toJSON().components.find(component =>
            component.type === ComponentType.Section && component.accessory.type === ComponentType.Button);
        assert.ok(section, "no section with the reroll button");
        const button = section.type === ComponentType.Section ? section.accessory : null;
        assert.ok(button && button.type === ComponentType.Button && button.style === ButtonStyle.Secondary);
        assert.equal("custom_id" in button ? button.custom_id : null, "dice_reroll|s|2d6+3");
    });

    it("carries the visibility in the reroll button", () => {
        assert.match(build(rollWith("1d20", [3]), true).json, /dice_reroll\|p\|1d20/);
    });

    it("adds the mini mat and the filter list only with a filter", () => {
        assert.doesNotMatch(build(rollWith("3d6", [1, 2, 3])).json, /without filter|no filter|Dice matching/);

        const {texts} = build(rollWith("6d6kl3", [1, 5, 3, 3, 6, 2]));
        assert.ok(texts.some(text => text.startsWith("-# All dice, no filter")));
        assert.ok(texts.includes(`__**${FILTER_FIELD_NAME}**__`));
        assert.ok(texts.includes("`6d6kl3` keeps dice ≤ 3 → `[1] [3] [3] [2]`"));
    });

    it("stays under Discord's text limit on the biggest rolls", () => {
        const formula = "100d1000k>=1+100d1000kl999";
        const values = Array.from({length: 200}, (_, index) => 100 + index);
        const {texts} = build(rollWith(formula, values));
        const total = texts.reduce((sum, text) => sum + text.length, 0);
        // The footer added by ComponentManager.toInteraction has room left
        assert.ok(total <= TEXT_MAX_LENGTH - 60, `${total} characters`);
        assert.ok(texts.some(text => text.startsWith("```")), "the game mat must always be there");
    });
});
