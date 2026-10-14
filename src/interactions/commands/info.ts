import {ButtonBuilder, ChatInputCommandInteraction, ContainerBuilder, SeparatorSpacingSize} from "discord.js";
import {Bot, ButtonManager, ComponentManager} from "@spatulox/simplediscordbot";
import {LIMITS} from "../../dice/parser";
import {FILTER_FIELD_NAME} from "../../dice/format";
import {RATE_LIMIT} from "../../dice/reply";

export const INFO_PAGE_PREFIX = "info_page";
const INFO_PAGE_SEPARATOR = "|";
const BUTTONS_PER_ROW = 3;

type InfoPage = {
    id: string
    label: string
    emoji: string
    lines: () => string[]
};

/** One page per button under /info, the first one is shown by default */
export const INFO_PAGES: readonly InfoPage[] = [
    {
        id: "roll",
        label: "Roll a dice",
        emoji: "🎲",
        lines: () => [
            "Roll dice with `/roll dice:<formula>`. Add `private:True` for a secret roll that only you can see.",
            "`1d20`: one 20-sided die (`d20` works too)",
            "`3d6`: three 6-sided dice, added together",
            "`1d20+5` / `1d20-1`: a modifier",
            "`2d6+1d4-2`: several groups of dice, added or subtracted",
            "`d%`: one 100-sided die, same as `d100`",
            "-# Use the buttons below for filters, targets and how to read a result."
        ]
    },
    {
        id: "filters",
        label: "Filters",
        emoji: "🔎",
        lines: () => [
            "One filter per group of dice, right after it.",
            "**Keep the best or worst dice**: followed by a **number of dice** (1 by default)",
            "`kh` *keep highest*: `4d6kh3` keeps the 3 highest dice",
            "`kl` *keep lowest*: `4d6kl3` keeps the 3 lowest dice",
            "`dh` *drop highest*: `3d8dh1` drops the highest die",
            "`dl` *drop lowest*: `4d6dl1` drops the lowest die",
            "Advantage: `2d20kh1`, disadvantage: `2d20kl1`",
            "",
            "**Count successes**: a comparison (`<` `<=` `>` `>=` `=`) and a **face value**",
            "`4d6<=3`: counts the dice showing 3 or less (roll under)",
            "`6d10>=8`: counts the dice showing 8 or more (dice pools)",
            "The group is worth the **number of successes**. Under the table: the **faces total** of all its dice and the **successes faces total**",
            "Modifiers add to the successes: `6d10>=8+1`"
        ]
    },
    {
        id: "target",
        label: "Target",
        emoji: "🏁",
        lines: () => [
            "End the formula with `vs` and a value: the roll succeeds when the **total** reaches it.",
            "`2d6+3 vs 8`: success when the total is 8 or more (`>=` by default)",
            "`1d100 vs <=45`: success when the total is 45 or less (roll under)",
            "`6d10>=8 vs 3`: success with at least 3 successes",
            "The result shows ✅ **Success** or ❌ **Failure** under the table.",
            "-# Not to be confused with `2d6>=8`, which compares **each die** and counts successes."
        ]
    },
    {
        id: "result",
        label: "Result",
        emoji: "📊",
        lines: () => [
            "The result is a table titled with the formula:",
            "One row per group of dice: its **rolls** and their **sum** (or its successes)",
            "A `dice` column when there are several groups of dice",
            "A `mod` row for the modifiers, and a `total` row when there is more than one row",
            "Dice that do not count (dropped, or failed) are between parentheses: `15 (7)`",
            `The **${FILTER_FIELD_NAME}** section explains each filter of the roll`,
            "With `vs`, ✅ **Success** or ❌ **Failure** is shown under the table"
        ]
    },
    {
        id: "reroll",
        label: "Reroll",
        emoji: "🔁",
        lines: () => [
            "The **🎲 Reroll** button under a result rolls the same formula again.",
            "The new roll is **yours**, whoever rolled first, and keeps the same visibility:",
            "a public roll is rerolled in public, a `private` roll stays secret."
        ]
    },
    {
        id: "limits",
        label: "Limits",
        emoji: "⚠️",
        lines: () => [
            `${LIMITS.formulaLength} characters and ${LIMITS.maxTerms} groups of dice or modifiers per formula`,
            `${LIMITS.dicePerTerm} dice per group, ${LIMITS.totalDice} dice in total`,
            `${LIMITS.minSides} to ${LIMITS.maxSides} sides, modifiers up to ${LIMITS.maxConstant}`,
            `${RATE_LIMIT.rolls} rolls every ${RATE_LIMIT.windowMs / 1000} seconds per person`,
            "On huge rolls, the dice are replaced with `…` in the table: the sums stay."
        ]
    }
];

/**
 * /info : how to use the bot, one page per button.
 * Ephemeral, so asking for help does not flood the channel.
 */
export async function info(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.reply(ComponentManager.toInteraction(buildInfoContainer(), null, false, true))
    } catch (error) {
        Bot.log.error(`info command failed : ${error}`)
    }
}

/** The /info message showing `pageId` (the first page when unknown), with a button per page */
export function buildInfoContainer(pageId?: string): ContainerBuilder {
    const page = findInfoPage(pageId);
    const container = ComponentManager.create({
        title: "## 🎲 Dice Roll: how to use",
        separator: SeparatorSpacingSize.Small
    })

    const buttons = INFO_PAGES.map(other => buildInfoPageButton(other, other.id === page.id));
    const rows = Array.from({length: Math.ceil(buttons.length / BUTTONS_PER_ROW)}, (_, index) =>
        buttons.slice(index * BUTTONS_PER_ROW, (index + 1) * BUTTONS_PER_ROW));

    return ComponentManager.fields(container, [
        {value: [`### ${page.emoji} ${page.label}`, ...page.lines()].join("\n")},
        ...rows.map(row => ({button: row, separator: false as const}))
    ])
}

/** The current page is highlighted and disabled */
function buildInfoPageButton(page: InfoPage, current: boolean): ButtonBuilder {
    const options = {customId: [INFO_PAGE_PREFIX, page.id].join(INFO_PAGE_SEPARATOR), label: page.label, emoji: page.emoji, disabled: current};
    return current ? ButtonManager.primary(options) : ButtonManager.secondary(options);
}

export function parseInfoPageId(customId: string): string | null {
    const [prefix, pageId] = customId.split(INFO_PAGE_SEPARATOR);
    return prefix === INFO_PAGE_PREFIX && pageId ? pageId : null;
}

function findInfoPage(pageId?: string): InfoPage {
    return INFO_PAGES.find(page => page.id === pageId) ?? INFO_PAGES[0]!;
}
