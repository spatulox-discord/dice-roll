import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {MessageFlags, MessageFlagsBitField, MessageFlagsResolvable, RepliableInteraction} from "discord.js";
import {replyUnexpectedError} from "./replyUnexpectedError";

function fakeInteraction(state: {replied?: boolean, deferred?: boolean}) {
    const replies: {flags?: MessageFlagsResolvable}[] = [];
    const interaction = {
        replied: state.replied ?? false,
        deferred: state.deferred ?? false,
        reply: async (payload: {flags?: MessageFlagsResolvable}) => { replies.push(payload); }
    } as unknown as RepliableInteraction;
    return {interaction, replies};
}

describe("replyUnexpectedError", () => {
    it("answers ephemerally when nothing was answered yet", async () => {
        const {interaction, replies} = fakeInteraction({});
        await replyUnexpectedError(interaction);
        assert.equal(replies.length, 1);
        assert.ok(new MessageFlagsBitField(replies[0]!.flags).has(MessageFlags.Ephemeral));
    });

    it("does not answer twice", async () => {
        for (const state of [{replied: true}, {deferred: true}]) {
            const {interaction, replies} = fakeInteraction(state);
            await replyUnexpectedError(interaction);
            assert.equal(replies.length, 0);
        }
    });
});
