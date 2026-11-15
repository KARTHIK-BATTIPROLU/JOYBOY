/**
 * Project JOYBOY - Zero-Dependency E2E Test Runner & Assertion Harness
 * File: tests/runner.js
 * 
 * Capabilities:
 * - Standalone CLI runner with zero external dependencies (Node.js 22 built-ins).
 * - Full test lifecycle: describe, it/test, beforeAll, afterAll, beforeEach, afterEach.
 * - Rich assertion helpers with deep comparison and descriptive failure diffs.
 * - Async test execution with timeout safeguards (per-test & suite level).
 * - CLI flags: --tier <1-4>, --tier1..4, --file <path>, --filter <regex>, --bail, --timeout <ms>, --no-color, --verbose.
 * - ANSI color streaming terminal reporter with clean stack traces and box-drawing summary table.
 * - Strict exit code semantics: exit 0 on 100% pass, exit 1 on any failure or unhandled exception.
 */

const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const nodeAssert = require('node:assert');
const { performance } = require('node:perf_hooks');

// ============================================================================
// 1. ANSI Terminal Styling & Formatting Utilities
// ============================================================================

const isWindows = process.platform === 'win32';
const hasColor = !process.env.NO_COLOR && (
  process.env.FORCE_COLOR !== undefined ||
  process.argv.includes('--color') ||
  (!process.argv.includes('--no-color') && process.stdout.isTTY)
);

const colors = {
  reset: hasColor ? '\x1b[0m' : '',
  bold: hasColor ? '\x1b[1m' : '',
  dim: hasColor ? '\x1b[2m' : '',
  red: hasColor ? '\x1b[31m' : '',
  green: hasColor ? '\x1b[32m' : '',
  yellow: hasColor ? '\x1b[33m' : '',
  blue: hasColor ? '\x1b[34m' : '',
  magenta: hasColor ? '\x1b[35m' : '',
  cyan: hasColor ? '\x1b[36m' : '',
  gray: hasColor ? '\x1b[90m' : '',
  bgRed: hasColor ? '\x1b[41m\x1b[37m' : '',
  bgGreen: hasColor ? '\x1b[42m\x1b[30m' : '',
};

const symbols = {
  pass: hasColor ? `${colors.green}✓${colors.reset}` : '[PASS]',
  fail: hasColor ? `${colors.red}✗${colors.reset}` : '[FAIL]',
  skip: hasColor ? `${colors.yellow}○${colors.reset}` : '[SKIP]',
  bullet: '•',
};

// ============================================================================
// 2. Custom AssertionError & Rich Assertion Helpers
// ============================================================================

class AssertionError extends Error {
  constructor(message, actual, expected, operator) {
    super(message || 'AssertionError');
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
    this.operator = operator;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssertionError);
    }
  }
}

function baseAssert(condition, message) {
  if (!condition) {
    throw new AssertionError(
      message || 'Expected condition to be truthy',
      condition,
      true,
      'assert'
    );
  }
}

const assertions = {
  assert: baseAssert,

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new AssertionError(
        message || `Expected ${util.inspect(expected)} but got ${util.inspect(actual)}`,
        actual,
        expected,
        'assertEquals'
      );
    }
  },

  assertNotEquals(actual, expected, message) {
    if (actual === expected) {
      throw new AssertionError(
        message || `Expected values not to equal ${util.inspect(expected)}`,
        actual,
        expected,
        'assertNotEquals'
      );
    }
  },

  assertDeepEquals(actual, expected, message) {
    try {
      nodeAssert.deepStrictEqual(actual, expected);
    } catch (err) {
      throw new AssertionError(
        message || err.message,
        actual,
        expected,
        'assertDeepEquals'
      );
    }
  },

  assertThrows(fn, expectedError, message) {
    let threw = false;
    let actualError = null;
    try {
      fn();
    } catch (err) {
      threw = true;
      actualError = err;
    }
    if (!threw) {
      throw new AssertionError(
        message || 'Expected function to throw an error, but it did not',
        undefined,
        expectedError || Error,
        'assertThrows'
      );
    }
    if (expectedError) {
      if (typeof expectedError === 'function') {
        if (!(actualError instanceof expectedError)) {
          throw new AssertionError(
            message || `Expected thrown error to be instance of ${expectedError.name}, got ${actualError?.constructor?.name}`,
            actualError,
            expectedError,
            'assertThrows'
          );
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError?.message || '')) {
          throw new AssertionError(
            message || `Expected error message "${actualError?.message}" to match ${expectedError}`,
            actualError?.message,
            expectedError,
            'assertThrows'
          );
        }
      } else if (typeof expectedError === 'string') {
        if (!actualError?.message?.includes(expectedError)) {
          throw new AssertionError(
            message || `Expected error message "${actualError?.message}" to include "${expectedError}"`,
            actualError?.message,
            expectedError,
            'assertThrows'
          );
        }
      }
    }
  },

  async assertRejects(asyncFnOrPromise, expectedError, message) {
    let threw = false;
    let actualError = null;
    try {
      const p = typeof asyncFnOrPromise === 'function' ? asyncFnOrPromise() : asyncFnOrPromise;
      await p;
    } catch (err) {
      threw = true;
      actualError = err;
    }
    if (!threw) {
      throw new AssertionError(
        message || 'Expected promise to reject, but it resolved successfully',
        undefined,
        expectedError || Error,
        'assertRejects'
      );
    }
    if (expectedError) {
      if (typeof expectedError === 'function') {
        if (!(actualError instanceof expectedError)) {
          throw new AssertionError(
            message || `Expected rejected error to be instance of ${expectedError.name}, got ${actualError?.constructor?.name}`,
            actualError,
            expectedError,
            'assertRejects'
          );
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError?.message || '')) {
          throw new AssertionError(
            message || `Expected rejection message "${actualError?.message}" to match ${expectedError}`,
            actualError?.message,
            expectedError,
            'assertRejects'
          );
        }
      } else if (typeof expectedError === 'string') {
        if (!actualError?.message?.includes(expectedError)) {
          throw new AssertionError(
            message || `Expected rejection message "${actualError?.message}" to include "${expectedError}"`,
            actualError?.message,
            expectedError,
            'assertRejects'
          );
        }
      }
    }
  },

  assertIncludes(haystack, needle, message) {
    if (typeof haystack === 'string') {
      if (!haystack.includes(needle)) {
        throw new AssertionError(
          message || `Expected string to include "${needle}"`,
          haystack,
          needle,
          'assertIncludes'
        );
      }
    } else if (Array.isArray(haystack)) {
      if (!haystack.includes(needle)) {
        throw new AssertionError(
          message || `Expected array to include item ${util.inspect(needle)}`,
          haystack,
          needle,
          'assertIncludes'
        );
      }
    } else {
      throw new AssertionError(
        message || `assertIncludes requires string or array, got ${typeof haystack}`,
        haystack,
        needle,
        'assertIncludes'
      );
    }
  },

  assertNotIncludes(haystack, needle, message) {
    if (typeof haystack === 'string' && haystack.includes(needle)) {
      throw new AssertionError(
        message || `Expected string NOT to include "${needle}"`,
        haystack,
        needle,
        'assertNotIncludes'
      );
    } else if (Array.isArray(haystack) && haystack.includes(needle)) {
      throw new AssertionError(
        message || `Expected array NOT to include item ${util.inspect(needle)}`,
        haystack,
        needle,
        'assertNotIncludes'
      );
    }
  },

  assertMatch(string, regex, message) {
    if (!regex.test(string)) {
      throw new AssertionError(
        message || `Expected "${string}" to match regex ${regex}`,
        string,
        regex,
        'assertMatch'
      );
    }
  },

  assertNotMatch(string, regex, message) {
    if (regex.test(string)) {
      throw new AssertionError(
        message || `Expected "${string}" NOT to match regex ${regex}`,
        string,
        regex,
        'assertNotMatch'
      );
    }
  },

  assertGreaterThan(actual, threshold, message) {
    if (!(actual > threshold)) {
      throw new AssertionError(
        message || `Expected ${actual} to be greater than ${threshold}`,
        actual,
        threshold,
        'assertGreaterThan'
      );
    }
  },

  assertLessThan(actual, threshold, message) {
    if (!(actual < threshold)) {
      throw new AssertionError(
        message || `Expected ${actual} to be less than ${threshold}`,
        actual,
        threshold,
        'assertLessThan'
      );
    }
  },

  assertBetween(val, min, max, message) {
    if (val < min || val > max) {
      throw new AssertionError(
        message || `Expected ${val} to be between ${min} and ${max}`,
        val,
        { min, max },
        'assertBetween'
      );
    }
  },

  assertType(val, expectedType, message) {
    const actualType = typeof val;
    if (actualType !== expectedType) {
      throw new AssertionError(
        message || `Expected type "${expectedType}", got "${actualType}"`,
        actualType,
        expectedType,
        'assertType'
      );
    }
  },

  assertSchema(obj, schema, message) {
    if (typeof obj !== 'object' || obj === null) {
      throw new AssertionError(
        message || `Expected object matching schema, got ${obj}`,
        obj,
        schema,
        'assertSchema'
      );
    }
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in obj)) {
        throw new AssertionError(
          message || `Missing required property "${key}" in schema`,
          Object.keys(obj),
          key,
          'assertSchema'
        );
      }
      if (typeof type === 'string' && typeof obj[key] !== type) {
        throw new AssertionError(
          message || `Property "${key}" has type "${typeof obj[key]}", expected "${type}"`,
          typeof obj[key],
          type,
          'assertSchema'
        );
      }
    }
  },

  fail(message) {
    throw new AssertionError(message || 'Explicit test failure triggered', undefined, undefined, 'fail');
  }
};

// Aliases and node:assert compatibility
assertions.assertRange = assertions.assertBetween;
baseAssert.strictEqual = assertions.assertEquals;
baseAssert.notStrictEqual = assertions.assertNotEquals;
baseAssert.deepStrictEqual = assertions.assertDeepEquals;
baseAssert.throws = assertions.assertThrows;
baseAssert.rejects = assertions.assertRejects;
baseAssert.ok = assertions.assert;
baseAssert.match = assertions.assertMatch;
baseAssert.doesNotThrow = (fn, message) => {
  try {
    fn();
  } catch (err) {
    throw new AssertionError(message || `Expected function not to throw, but it threw ${err.message}`, err, undefined, 'doesNotThrow');
  }
};

// ============================================================================
// 3. Test Registry & Lifecycle Context
// ============================================================================

class TestContext {
  constructor() {
    this.suites = [];
    this.suiteStack = [];
    this.currentFile = '';
  }

  reset() {
    this.suites = [];
    this.suiteStack = [];
  }

  getCurrentSuite() {
    return this.suiteStack.length > 0 ? this.suiteStack[this.suiteStack.length - 1] : null;
  }

  registerSuite(name, fn) {
    const parent = this.getCurrentSuite();
    const suite = {
      name,
      file: this.currentFile,
      parent,
      suites: [],
      tests: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: [],
    };
    if (parent) {
      parent.suites.push(suite);
    } else {
      this.suites.push(suite);
    }
    this.suiteStack.push(suite);
    try {
      fn();
    } finally {
      this.suiteStack.pop();
    }
  }

  registerTest(name, fn, opts = {}) {
    const suite = this.getCurrentSuite();
    if (!suite) {
      throw new Error(`Test "${name}" must be declared inside a describe() block`);
    }
    suite.tests.push({
      name,
      fn,
      opts,
      skip: opts.skip || false,
      timeout: opts.timeout || null,
      suite,
      status: 'pending',
      duration: 0,
      error: null
    });
  }

  registerHook(type, fn) {
    const suite = this.getCurrentSuite();
    if (!suite) {
      throw new Error(`Hook ${type} must be declared inside a describe() block`);
    }
    suite[type].push(fn);
  }
}

const context = new TestContext();

// DSL Functions
function describe(name, fn) {
  context.registerSuite(name, fn);
}

function it(name, fn, opts) {
  context.registerTest(name, fn, opts);
}
it.skip = function (name, fn, opts = {}) {
  context.registerTest(name, fn, { ...opts, skip: true });
};

const test = it;
test.skip = it.skip;

function beforeAll(fn) { context.registerHook('beforeAll', fn); }
function afterAll(fn) { context.registerHook('afterAll', fn); }
function beforeEach(fn) { context.registerHook('beforeEach', fn); }
function afterEach(fn) { context.registerHook('afterEach', fn); }

// ============================================================================
// 4. CLI Argument Parser & Execution Options
// ============================================================================

function parseArgs(argv) {
  const options = {
    tier: null,
    files: [],
    filter: null,
    bail: false,
    timeout: 10000,
    color: hasColor,
    verbose: false,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--bail' || arg === '-b') options.bail = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--no-color') options.color = false;
    else if (arg === '--tier1') options.tier = 1;
    else if (arg === '--tier2') options.tier = 2;
    else if (arg === '--tier3') options.tier = 3;
    else if (arg === '--tier4') options.tier = 4;
    else if (arg.startsWith('--tier=')) options.tier = parseInt(arg.split('=')[1], 10);
    else if (arg === '--tier' && i + 1 < argv.length) options.tier = parseInt(argv[++i], 10);
    else if (arg.startsWith('--filter=')) options.filter = arg.split('=')[1];
    else if (arg === '--filter' && i + 1 < argv.length) options.filter = argv[++i];
    else if (arg.startsWith('--timeout=')) options.timeout = parseInt(arg.split('=')[1], 10);
    else if (arg === '--timeout' && i + 1 < argv.length) options.timeout = parseInt(argv[++i], 10);
    else if (arg.startsWith('--file=')) options.files.push(arg.split('=')[1]);
    else if (arg === '--file' && i + 1 < argv.length) options.files.push(argv[++i]);
    else if (!arg.startsWith('-')) options.files.push(arg);
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.bold}${colors.cyan}Project JOYBOY - E2E Test Runner${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node tests/runner.js [options] [files...]

${colors.bold}OPTIONS:${colors.reset}
  --tier <1-4>          Run only the specified tier (1: Features, 2: Boundaries, 3: Combinations, 4: Scenarios)
  --tier1, --tier2...   Shorthand tier selectors
  --file <path>         Run a specific test file
  --filter <pattern>    Filter test descriptions by regex or substring
  --bail, -b            Abort suite execution immediately upon first failure
  --timeout <ms>        Default per-test timeout in milliseconds (default: 10000)
  --no-color            Disable ANSI color output
  --verbose, -v         Enable detailed diagnostic logging
  --help, -h            Show this help screen

${colors.bold}EXAMPLES:${colors.reset}
  node tests/runner.js                      # Run full test suite across all 4 tiers
  node tests/runner.js --tier 1             # Run Tier 1 Feature tests only
  node tests/runner.js --tier2 --bail       # Run Tier 2 Boundary tests, exit on first failure
  node tests/runner.js --filter "Sanitizer" # Run tests matching "Sanitizer"
`);
}

// ============================================================================
// 5. Test File Discovery
// ============================================================================

function resolveTestFiles(options) {
  const testsDir = path.resolve(__dirname);
  const tierFileMap = {
    1: 'tier1_features.test.js',
    2: 'tier2_boundaries.test.js',
    3: 'tier3_combinations.test.js',
    4: 'tier4_scenarios.test.js'
  };

  if (options.files.length > 0) {
    return options.files.map(f => path.resolve(process.cwd(), f));
  }

  if (options.tier !== null) {
    const filename = tierFileMap[options.tier];
    if (!filename) {
      console.error(`${colors.red}Error: Invalid tier ${options.tier}. Must be 1, 2, 3, or 4.${colors.reset}`);
      process.exit(1);
    }
    const fullPath = path.join(testsDir, filename);
    return [fullPath];
  }

  // Default: run all 4 tiers in sequential order
  return [
    path.join(testsDir, 'tier1_features.test.js'),
    path.join(testsDir, 'tier2_boundaries.test.js'),
    path.join(testsDir, 'tier3_combinations.test.js'),
    path.join(testsDir, 'tier4_scenarios.test.js')
  ];
}

// ============================================================================
// 6. Test Runner Engine & Execution Loop
// ============================================================================

class TestRunner {
  constructor(options) {
    this.options = options;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tiers: {},
      failures: []
    };
  }

  filterStack(stack) {
    if (!stack) return '';
    return stack
      .split('\n')
      .filter(line => !line.includes('node:internal') && !line.includes('runner.js'))
      .slice(0, 6)
      .join('\n');
  }

  async runWithTimeout(fn, timeoutMs) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });
    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  async executeSuite(suite, tierKey, depth = 0) {
    const indent = '  '.repeat(depth);
    if (depth > 0) {
      console.log(`${indent}${colors.bold}${colors.cyan}${suite.name}${colors.reset}`);
    }

    // Execute beforeAll hooks
    for (const hook of suite.beforeAll) {
      await hook();
    }

    // Execute tests
    for (const testItem of suite.tests) {
      // Check filter
      if (this.options.filter && !testItem.name.includes(this.options.filter)) {
        continue;
      }

      this.stats.total++;
      this.stats.tiers[tierKey].total++;

      if (testItem.skip) {
        this.stats.skipped++;
        this.stats.tiers[tierKey].skipped++;
        console.log(`${indent}  ${symbols.skip} ${colors.gray}${testItem.name} (skipped)${colors.reset}`);
        continue;
      }

      // Execute beforeEach hooks (from root down to current suite)
      let hooksSuccess = true;
      try {
        const suiteChain = [];
        let curr = suite;
        while (curr) {
          suiteChain.unshift(curr);
          curr = curr.parent;
        }
        for (const s of suiteChain) {
          for (const hook of s.beforeEach) {
            await hook();
          }
        }
      } catch (err) {
        hooksSuccess = false;
        testItem.status = 'failed';
        testItem.error = err;
      }

      if (hooksSuccess) {
        const testTimeout = testItem.timeout || this.options.timeout;
        const start = performance.now();
        try {
          await this.runWithTimeout(() => testItem.fn(), testTimeout);
          testItem.duration = Math.round(performance.now() - start);
          testItem.status = 'passed';
          this.stats.passed++;
          this.stats.tiers[tierKey].passed++;
          console.log(`${indent}  ${symbols.pass} ${testItem.name} ${colors.gray}(${testItem.duration}ms)${colors.reset}`);
        } catch (err) {
          testItem.duration = Math.round(performance.now() - start);
          testItem.status = 'failed';
          testItem.error = err;
          this.stats.failed++;
          this.stats.tiers[tierKey].failed++;
          this.stats.failures.push({
            test: testItem,
            suiteName: suite.name,
            tierKey,
            error: err
          });
          console.log(`${indent}  ${symbols.fail} ${colors.red}${testItem.name}${colors.reset} ${colors.gray}(${testItem.duration}ms)${colors.reset}`);
          if (this.options.bail) {
            console.log(`\n${colors.yellow}[BAIL] Stopping test run immediately due to failure.${colors.reset}`);
            return false;
          }
        }
      } else {
        this.stats.failed++;
        this.stats.tiers[tierKey].failed++;
        this.stats.failures.push({
          test: testItem,
          suiteName: suite.name,
          tierKey,
          error: testItem.error
        });
        console.log(`${indent}  ${symbols.fail} ${colors.red}${testItem.name} [beforeEach Hook Failed]${colors.reset}`);
        if (this.options.bail) return false;
      }

      // Execute afterEach hooks (current suite up to root)
      try {
        let curr = suite;
        while (curr) {
          for (const hook of curr.afterEach) {
            await hook();
          }
          curr = curr.parent;
        }
      } catch (err) {
        console.error(`${indent}  ${colors.red}Warning: afterEach hook failed: ${err.message}${colors.reset}`);
      }
    }

    // Nested suites
    for (const nested of suite.suites) {
      const continueRun = await this.executeSuite(nested, tierKey, depth + 1);
      if (!continueRun) return false;
    }

    // Execute afterAll hooks
    for (const hook of suite.afterAll) {
      await hook();
    }

    return true;
  }

  printSummaryTable() {
    const pad = (str, len, align = 'left') => {
      str = String(str);
      if (str.length >= len) return str;
      return align === 'right' ? ' '.repeat(len - str.length) + str : str + ' '.repeat(len - str.length);
    };

    console.log('\n┌────────────────────────────────────────┬────────┬────────┬────────┬────────┬──────────┐');
    console.log(`│ ${pad('Test Suite / Tier', 38)} │ ${pad('Total', 6, 'right')} │ ${pad('Passed', 6, 'right')} │ ${pad('Failed', 6, 'right')} │ ${pad('Skip', 6, 'right')} │ ${pad('Duration', 8, 'right')} │`);
    console.log('├────────────────────────────────────────┼────────┼────────┼────────┼────────┼──────────┤');

    for (const [tier, stat] of Object.entries(this.stats.tiers)) {
      console.log(`│ ${pad(tier, 38)} │ ${pad(stat.total, 6, 'right')} │ ${pad(stat.passed, 6, 'right')} │ ${pad(stat.failed, 6, 'right')} │ ${pad(stat.skipped, 6, 'right')} │ ${pad(`${stat.duration}ms`, 8, 'right')} │`);
    }

    console.log('├────────────────────────────────────────┼────────┼────────┼────────┼────────┼──────────┤');
    console.log(`│ ${colors.bold}${pad('TOTALS', 38)}${colors.reset} │ ${colors.bold}${pad(this.stats.total, 6, 'right')}${colors.reset} │ ${colors.green}${pad(this.stats.passed, 6, 'right')}${colors.reset} │ ${this.stats.failed > 0 ? colors.red : colors.gray}${pad(this.stats.failed, 6, 'right')}${colors.reset} │ ${pad(this.stats.skipped, 6, 'right')} │ ${pad(`${this.stats.duration}ms`, 8, 'right')} │`);
    console.log('└────────────────────────────────────────┴────────┴────────┴────────┴────────┴──────────┘');
  }

  printFailures() {
    if (this.stats.failures.length === 0) return;

    console.log(`\n${colors.bold}${colors.red}================================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.red}FAILURES (${this.stats.failures.length}):${colors.reset}`);
    console.log(`${colors.bold}${colors.red}================================================================================${colors.reset}\n`);

    this.stats.failures.forEach((f, idx) => {
      console.log(`${colors.bold}${idx + 1}) [${f.tierKey}] ${f.suiteName} > ${f.test.name}${colors.reset}`);
      console.log(`   ${colors.red}${f.error.name}: ${f.error.message}${colors.reset}`);
      if (f.error instanceof AssertionError && f.error.expected !== undefined) {
        console.log(`   ${colors.yellow}Expected:${colors.reset} ${util.inspect(f.error.expected, { depth: 3, colors: hasColor })}`);
        console.log(`   ${colors.cyan}Actual:  ${colors.reset} ${util.inspect(f.error.actual, { depth: 3, colors: hasColor })}`);
      }
      const filteredStack = this.filterStack(f.error.stack);
      if (filteredStack) {
        console.log(`   ${colors.gray}Stack Trace:${colors.reset}`);
        console.log(filteredStack.split('\n').map(l => `     ${colors.gray}${l}${colors.reset}`).join('\n'));
      }
      console.log('');
    });
  }

  async run(files) {
    const overallStart = performance.now();
    console.log(`${colors.bold}${colors.magenta}================================================================================${colors.reset}`);
    console.log(`${colors.bold} JOYBOY E2E Test Suite Runner (Zero-Dependency Node.js Harness)${colors.reset}`);
    console.log(`${colors.gray} Node: ${process.version} | OS: ${process.platform} | Time: ${new Date().toISOString()}${colors.reset}`);
    console.log(`${colors.bold}${colors.magenta}================================================================================${colors.reset}\n`);

    // Inject test primitives onto globalThis so test files need no import boilerplate
    Object.assign(globalThis, {
      describe,
      it,
      test,
      beforeAll,
      afterAll,
      beforeEach,
      afterEach,
      ...assertions
    });

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}Notice: Test file ${path.basename(filePath)} does not exist yet. Skipping.${colors.reset}`);
        continue;
      }

      const basename = path.basename(filePath);
      const tierMatch = basename.match(/tier(\d+)/i);
      const tierNumber = tierMatch ? tierMatch[1] : '?';
      const tierKey = `Tier ${tierNumber}: ${basename.replace('.test.js', '')}`;

      this.stats.tiers[tierKey] = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      };

      console.log(`${colors.bold}${colors.blue}▶ Loading: ${basename}${colors.reset}`);
      context.reset();
      context.currentFile = basename;

      const fileStart = performance.now();
      try {
        require(filePath);
      } catch (loadErr) {
        console.error(`${colors.red}Fatal: Failed to load ${basename}: ${loadErr.message}${colors.reset}`);
        this.stats.failed++;
        this.stats.tiers[tierKey].failed++;
        this.stats.failures.push({
          test: { name: `File Load: ${basename}` },
          suiteName: basename,
          tierKey,
          error: loadErr
        });
        if (this.options.bail) break;
        continue;
      }

      for (const suite of context.suites) {
        console.log(`\n  ${colors.bold}${colors.yellow}● Suite: ${suite.name}${colors.reset}`);
        const continueRun = await this.executeSuite(suite, tierKey, 1);
        if (!continueRun) break;
      }

      this.stats.tiers[tierKey].duration = Math.round(performance.now() - fileStart);
    }

    this.stats.duration = Math.round(performance.now() - overallStart);

    this.printFailures();
    this.printSummaryTable();

    if (this.stats.failed > 0) {
      console.log(`\n${colors.bgRed} FAILED ${colors.reset} ${colors.red}${this.stats.failed} test(s) failed out of ${this.stats.total}.${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${colors.bgGreen} PASSED ${colors.reset} ${colors.green}All ${this.stats.passed} test(s) passed successfully across all tiers! Dahahaha!${colors.reset}\n`);
      process.exit(0);
    }
  }
}

// ============================================================================
// 7. CLI Entrypoint & Exports
// ============================================================================

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  const files = resolveTestFiles(options);
  const runner = new TestRunner(options);
  runner.run(files).catch(err => {
    console.error(`\n${colors.red}Unhandled Test Runner Exception: ${err.stack || err.message}${colors.reset}`);
    process.exit(1);
  });
}

// Module export for dual library usage
module.exports = {
  describe,
  it,
  test,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  ...assertions,
  TestRunner,
  parseArgs,
  AssertionError
};
