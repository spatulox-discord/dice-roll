import {randomInt} from "node:crypto";
import {DiceFormula, DiceTerm, KeepRule, matchesValue, Term} from "./parser";

/** Returns a value between 1 and `sides` (both included) */
export type Rng = (sides: number) => number;

export const cryptoRng: Rng = (sides) => randomInt(1, sides + 1);

export type DieResult = {
    value: number
    kept: boolean
};

export type TermResult = {
    term: Term
    /** Empty for a constant term */
    dice: DieResult[]
    /** Signed contribution of the term to the total */
    subtotal: number
};

export type Critical = 'success' | 'failure' | null;

export type RollResult = {
    formula: DiceFormula
    terms: TermResult[]
    total: number
    critical: Critical
};

export function rollFormula(formula: DiceFormula, rng: Rng = cryptoRng): RollResult {
    const terms = formula.terms.map(term => rollTerm(term, rng));
    const total = terms.reduce((sum, term) => sum + term.subtotal, 0);
    return {formula, terms, total, critical: detectCritical(terms)};
}

function rollTerm(term: Term, rng: Rng): TermResult {
    if (term.kind === 'constant') {
        return {term, dice: [], subtotal: term.sign * term.value};
    }

    const values = Array.from({length: term.count}, () => rng(term.sides));
    const kept = keptIndexes(values, term.keep);
    const dice = values.map((value, index) => ({value, kept: kept.has(index)}));
    const sum = dice.reduce((acc, die) => acc + (die.kept ? die.value : 0), 0);

    return {term, dice, subtotal: term.sign * sum};
}

/**
 * Indexes of the dice that count in the total : every die whose face matches the filter.
 */
export function keptIndexes(values: number[], keep: KeepRule | null): Set<number> {
    const all = values.map((_, index) => index);
    return new Set(keep ? all.filter(index => matchesValue(values[index]!, keep)) : all);
}

/**
 * A natural 20 / natural 1 only makes sense when the roll boils down to a single kept d20
 * (`1d20+5`, `2d20kh15` with a single die >= 15...), not on `3d20` or `1d20+1d4`.
 */
function detectCritical(terms: TermResult[]): Critical {
    const diceTerms = terms.filter((result): result is TermResult & {term: DiceTerm} => result.term.kind === 'dice');
    if (diceTerms.length !== 1) {
        return null;
    }

    const [only] = diceTerms;
    if (!only || only.term.sides !== 20 || only.term.sign !== 1) {
        return null;
    }

    const kept = only.dice.filter(die => die.kept);
    if (kept.length !== 1) {
        return null;
    }

    if (kept[0]!.value === 20) return 'success';
    if (kept[0]!.value === 1) return 'failure';
    return null;
}
