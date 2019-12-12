'use strict'

/**
 * @module Rules
 */

const { expect } = require('chai')
const moment = require('moment-timezone')

const negationRegexFragment = `!|! |not |does not |doesn't |is not |isn't `

/**
 * Get a Rule corresponding to the given matcher.
 * If the matcher doesn't match any defined Rules, throws an AssertionError.
 *
 * @example
 * Assertions.getMatchingRule(`doesn't match`)
 * // => { name: 'match', isNegated: true }
 * Assertions.getMatchingRule(`contains`)
 * // => { name: 'contain', isNegated: false }
 * Assertions.getMatchingRule(`unknown matcher`)
 * // => throws AssertionError
 * @param {string} matcher
 * @return {Rule} the Rule corresponding to the matcher
 * @throws AssertionError
 */
exports.getMatchingRule = matcher => {
    const rules = [Match, Contain, Present, RelativeDate, Type, Equal]
    for (const rule of rules) {
        const groups = rule.match(matcher)
        if (groups) {
            return new rule(groups[1])
        }
    }

    expect.fail(`Matcher "${matcher}" did not match any supported assertions`)
}

class Rule {
    constructor(isNegated) {
        /**
         * Is the Rule's assertion negated
         * @private
         */
        this.isNegated = isNegated
    }

    /**
     * Test the value of a field against an expected value with the assertion defined by the Rule.
     *
     * @param {string} field the name of the field
     * @param {object} currentValue the value of the field
     * @param {object} expectedValue the expected value
     * @return {void}
     * @throws AssertionError
     */
    test(field, currentValue, expectedValue) {
        const baseExpect = expect(currentValue, this.getMessage(field, currentValue, expectedValue))
        this.assert(this.isNegated ? baseExpect.not : baseExpect, expectedValue)
    }

    /**
     * Internal Method - Implementation not required
     *
     * @private
     * @param {string} matcher
     * @return {RegExpExecArray} matching result
     */
    static match(matcher) {
        return new RegExp(`^(${negationRegexFragment})?(${this.getRegExpFragment()})$`).exec(
            matcher
        )
    }

    /**
     * Internal Method - Must be implemented
     *
     * @private
     * @abstract
     * @return {string}
     */
    static getRegExpFragment() {
        throw new Error('You have to implement the method isMatching!')
    }

    /**
     * Internal Method - Must be implemented
     *
     * @private
     * @abstract
     * @param {string} field
     * @param {object} currentValue
     * @param {object} expectedValue
     * @return {string} the assertion message
     */
    getMessage(field, currentValue, expectedValue) {
        throw new Error('You have to implement the method getMessage!')
    }

    /**
     * Internal Method - Must be implemented
     *
     * @private
     * @abstract
     * @param {object} baseExpect
     * @param {object} expectedValue
     * @return {void}
     */
    assert(baseExpect, expectedValue) {
        throw new Error('You have to implement the method assert!')
    }
}

class Match extends Rule {
    constructor(isNegated) {
        super(isNegated)
    }

    static getRegExpFragment() {
        return `match|matches`
    }

    getMessage(field, currentValue, expectedValue) {
        return `Property '${field}' (${currentValue}) ${
            this.isNegated ? 'matches' : 'does not match'
        } '${expectedValue}'`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.match(new RegExp(expectedValue))
    }
}

class Contain extends Rule {
    constructor(isNegated) {
        super(isNegated)
    }

    static getRegExpFragment() {
        return `contain|contains`
    }

    getMessage(field, currentValue, expectedValue) {
        return `Property '${field}' (${currentValue}) ${
            this.isNegated ? 'contains' : 'does not contain'
        } '${expectedValue}'`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.contain(expectedValue)
    }
}

class Present extends Rule {
    constructor(isNegated) {
        // Reverse isNegated due to the nature of the assertion
        super(!isNegated)
    }

    static getRegExpFragment() {
        return `defined|present`
    }

    getMessage(field, currentValue, expectedValue) {
        return `Property '${field}' is ${!this.isNegated ? 'defined' : 'undefined'}`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.be.undefined
    }
}

class RelativeDate extends Rule {
    constructor(isNegated) {
        super(isNegated)
    }

    static getRegExpFragment() {
        return `equalRelativeDate`
    }

    test(field, currentValue, expectedValue) {
        const match = /^(\+?\d|-?\d),([A-Za-z]+),([A-Za-z-]{2,5}),(.+)$/.exec(expectedValue)
        if (match === null) throw new Error('relative date arguments are invalid')
        const [, amount, unit, locale, format] = match
        const normalizedLocale = Intl.getCanonicalLocales(locale)[0]
        const expectedDate = moment()
            .add(amount, unit)
            .locale(normalizedLocale)
            .format(format)
        super.test(field, currentValue, expectedDate)
    }

    getMessage(field, currentValue, expectedValue) {
        return `Expected property '${field}' to ${
            this.isNegated ? 'not ' : ''
        }equal '${expectedValue}', but found '${currentValue}'`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.be.deep.equal(expectedValue)
    }
}

class Type extends Rule {
    constructor(isNegated) {
        super(isNegated)
    }

    static getRegExpFragment() {
        return `type`
    }

    getMessage(field, currentValue, expectedValue) {
        return `Property '${field}' (${currentValue}) type is${
            this.isNegated ? '' : ' not'
        } '${expectedValue}'`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.be.a(expectedValue)
    }
}

class Equal extends Rule {
    constructor(isNegated) {
        super(isNegated)
    }

    static getRegExpFragment() {
        return `equal|equals`
    }

    getMessage(field, currentValue, expectedValue) {
        return `Expected property '${field}' to${
            this.isNegated ? ' not' : ''
        } equal '${expectedValue}', but found '${currentValue}'`
    }

    assert(baseExpect, expectedValue) {
        baseExpect.to.be.deep.equal(expectedValue)
    }
}
