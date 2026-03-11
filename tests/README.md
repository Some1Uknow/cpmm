## Test Layers

This project uses a 3-layer setup:

1. Rust unit/invariant tests
- Location: `programs/cpmm/src/**` with `#[cfg(test)]`.
- Purpose: fast deterministic math and state checks.

2. TypeScript integration tests on LiteSVM
- Location: `tests/integration/**/*.test.ts`.
- Purpose: instruction/account flow checks without a local validator.

3. TypeScript smoke tests on LiteSVM
- Location: `tests/e2e/**/*.test.ts`.
- Purpose: lightweight program/client smoke coverage.

## Commands

1. Build + Rust unit tests
```bash
anchor build
cargo test -p cpmm
```

2. Full TypeScript test run on LiteSVM
```bash
anchor test
```
