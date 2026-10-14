import {randomInt} from "node:crypto";
import {DiceFilter, DiceFormula, matchesValue, Term} from "./parser";

/** Returns a value between 1 and `sides` (both included) */
export type Rng = (sides: number) => number;

export const cryptoRng: Rng = (sides) => randomInt(1, sides + 1);

export type DieResult = {
    value: number
    /** False for a die dropped by kh / kl / dh / dl, or a failed die of a success count */
    kept: boolean
};

export type TermResult = {
    term: Term
    /** Empty for a constant term */
    dice: DieResult[]
    /** Signed contribution of the term to the total : the sum of the kept dice, or the number of successes */
    subtotal: number
    /** Sum of the faces of the kept dice (or of the successes), 0 for a constant term */
    faceTotal: number
};

export type RollResult = {
    formula: DiceFormula
    terms: TermResult[]
    total: number
    /** Whether the total matches the `vs` target, null without target */
    success: boolean | null
};

export function rollFormula(formula: DiceFormula, rng: Rng = cryptoRng): RollResult {
    const terms = formula.terms.map(term => rollTerm(term, rng));
    const total = terms.reduce((sum, term) => sum + term.subtotal, 0);
    const success = formula.target ? matchesValue(total, formula.target) : null;
    return {formula, terms, total, success};
}

function rollTerm(term: Term, rng: Rng): TermResult {
    if (term.kind === 'constant') {
        return {term, dice: [], subtotal: term.sign * term.value, faceTotal: 0};
    }

    const values = Array.from({length: term.count}, () => rng(term.sides));
    const kept = keptIndexes(values, term.filter);
    const dice = values.map((value, index) => ({value, kept: kept.has(index)}));
    const faceTotal = dice.reduce((acc, die) => acc + (die.kept ? die.value : 0), 0);
    const worth = term.filter?.type === 'success' ? kept.size : faceTotal;

    return {term, dice, subtotal: term.sign * worth, faceTotal};
}

/**
 * Indexes of the dice that count : the kept ones for kh / kl / dh / dl, the successes for a comparison.
 * Ties in kh / kl / dh / dl are broken by roll order, so the result is deterministic.
 */
export function keptIndexes(values: number[], filter: DiceFilter | null): Set<number> {
    const all = values.map((_, index) => index);
    if (!filter) {
        return new Set(all);
    }
    if (filter.type === 'success') {
        return new Set(all.filter(index => matchesValue(values[index]!, filter)));
    }

    const ascending = [...all].sort((a, b) => values[a]! - values[b]! || a - b);
    const descending = [...all].sort((a, b) => values[b]! - values[a]! || a - b);

    switch (filter.mode) {
        case 'kh':
            return new Set(descending.slice(0, filter.count));
        case 'kl':
            return new Set(ascending.slice(0, filter.count));
        case 'dh':
            return new Set(descending.slice(filter.count));
        case 'dl':
            return new Set(ascending.slice(filter.count));
    }
}
