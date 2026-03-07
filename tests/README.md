## Test Layers

This project uses a 3-layer setup:

1. Rust unit/invariant tests
- Location: `programs/cpmm/src/**` with `#[cfg(test)]`.
- Purpose: fast deterministic math and state checks.

2. TypeScript integration tests
- Location: `tests/integration/**/*.test.ts`.
- Purpose: RPC + instruction wiring checks against local validator.

3. TypeScript e2e smoke tests
- Location: `tests/e2e/**/*.test.ts`.
- Purpose: full end-to-end transaction confirmation path.

## Commands

1. Build + Rust unit tests
```bash
anchor build
cargo test -p cpmm
```

2. Full TypeScript test run (integration + e2e)
```bash
anchor test
```

