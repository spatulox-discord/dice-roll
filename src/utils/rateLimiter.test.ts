import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {RateLimiter} from "./rateLimiter";

describe("RateLimiter", () => {
    it("allows the limit, then gives the time until the oldest action leaves the window", () => {
        const limiter = new RateLimiter(3, 10_000);
        assert.equal(limiter.take("a", 0), 0);
        assert.equal(limiter.take("a", 1_000), 0);
        assert.equal(limiter.take("a", 2_000), 0);
        assert.equal(limiter.take("a", 4_000), 6_000);
        assert.equal(limiter.take("a", 10_000), 0);
    });

    it("limits each user on their own", () => {
        const limiter = new RateLimiter(1, 10_000);
        assert.equal(limiter.take("a", 0), 0);
        assert.equal(limiter.take("b", 0), 0);
        assert.equal(limiter.take("a", 0), 10_000);
    });

    it("does not count a refused action", () => {
        const limiter = new RateLimiter(1, 10_000);
        limiter.take("a", 0);
        limiter.take("a", 5_000);
        assert.equal(limiter.take("a", 10_000), 0);
    });

    it("forgets the users whose actions all left the window", () => {
        const limiter = new RateLimiter(5, 10_000);
        limiter.take("a", 10_000);
        limiter.take("b", 15_000);
        assert.equal(limiter.size, 2);

        limiter.take("c", 21_000);
        assert.equal(limiter.size, 2, "a is forgotten, b is still in its window");
    });
});
