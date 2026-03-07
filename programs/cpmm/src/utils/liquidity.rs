use anchor_lang::prelude::*;

use crate::errors::Error;

/*
Detailed comments are intentional because this file defines core LP math.

Terminology:
- LP = "Liquidity Provider" share token (NOT the pool itself).
- LP supply = total number of LP share tokens that exist.
- token_x_reserve/token_y_reserve = balances in pool vaults.

Why this file exists:
- Keep add-liquidity math separate from CPI/account plumbing.
- Make formulas easy to test and audit.
- Centralize overflow-safe arithmetic rules.
*/

/// Basic user-input guards for add-liquidity.
/// Why:
/// - max_token_x_in == 0 or max_token_y_in == 0 means no real liquidity is added.
/// - min_lp_shares_out == 0 disables slippage protection.

pub fn validate_add_liquidity_inputs(
    max_token_x_in: u64,
    max_token_y_in: u64,
    min_lp_shares_out: u64,
) -> Result<()> {
    require!(
        max_token_x_in > 0 && max_token_y_in > 0,
        Error::InvalidLiquidityAmount
    );
    require!(min_lp_shares_out > 0, Error::InvalidMinLpOut);
    Ok(())
}

/// Bootstrap LP minting (first-ever liquidity only).
///
/// Formula:
///   lp_shares_to_mint = floor(sqrt(token_x_in * token_y_in))
///
/// Intuition:
/// - At bootstrap, there is no existing LP supply to compare against.
/// - Geometric mean gives a neutral starting share scale from both tokens.
///
/// Example:
/// - token_x_in = 400, token_y_in = 100
/// - deposit_product = 40_000
/// - sqrt(deposit_product) = 200
/// - mint 200 LP share tokens
pub fn compute_bootstrap_lp_shares_to_mint(
    token_x_reserve: u64,
    token_y_reserve: u64,
    token_x_in: u64,
    token_y_in: u64,
) -> Result<u64> {
    /*
    This helper is intentionally strict: bootstrap path only.
    If either reserve is non-zero, caller must use non-bootstrap logic.
    */
    if token_x_reserve != 0 || token_y_reserve != 0 {
        return err!(Error::NonBootstrapNotImplemented);
    }

    /*
    Multiply in u128 and with checked_mul to avoid overflow.
    */
    let deposit_product = (token_x_in as u128)
        .checked_mul(token_y_in as u128)
        .ok_or(Error::MathOverflow)?;

    /*
    Integer sqrt rounds down (floor), which is expected in on-chain math.
    */
    let lp_shares_to_mint = integer_sqrt(deposit_product);
    require!(lp_shares_to_mint <= u64::MAX as u128, Error::MathOverflow);
    Ok(lp_shares_to_mint as u64)
}

/// Integer square root via Newton's method.
///
/// Returns floor(sqrt(n)).
///
/// Why this algorithm:
/// - Fast convergence.
/// - Pure integer math (deterministic on-chain behavior).
fn integer_sqrt(n: u128) -> u128 {
    /*
    Trivial base cases.
    */
    if n < 2 {
        return n;
    }

    /*
    Initial guess and first refinement.
    */
    let mut x0 = n / 2;
    let mut x1 = (x0 + n / x0) / 2;

    /*
    Keep improving while moving down toward floor(sqrt(n)).
    */
    while x1 < x0 {
        x0 = x1;
        x1 = (x0 + n / x0) / 2;
    }

    x0
}

/// General LP math for both bootstrap and non-bootstrap paths.
///
/// Returns:
/// - lp_shares_to_mint: LP share tokens to mint.
/// - token_x_to_deposit: actual token X consumed from user.
/// - token_y_to_deposit: actual token Y consumed from user.
///
/// Why token_x_to_deposit/token_y_to_deposit are returned:
/// - User may send max budgets.
/// - Protocol should consume only balanced amounts that preserve pool ratio.
/// - Excess must stay with user.
///
/// Non-bootstrap derivation:
/// - Let T = current LP supply.
/// - From X side alone:
///     lp_from_x = max_token_x_in * T / token_x_reserve
/// - From Y side alone:
///     lp_from_y = max_token_y_in * T / token_y_reserve
/// - Must satisfy both, so:
///     lp_shares_to_mint = min(lp_from_x, lp_from_y)
/// - Then recover exact consumed tokens:
///     token_x_to_deposit = lp_shares_to_mint * token_x_reserve / T
///     token_y_to_deposit = lp_shares_to_mint * token_y_reserve / T
pub fn compute_lp_shares_and_token_deposit_amounts(
    token_x_reserve: u64,
    token_y_reserve: u64,
    total_lp_shares_supply: u64,
    max_token_x_in: u64,
    max_token_y_in: u64,
) -> Result<(u64, u64, u64)> {
    /*
    Bootstrap branch: pool empty and LP supply must be zero.
    */
    if token_x_reserve == 0 && token_y_reserve == 0 {
        require!(
            total_lp_shares_supply == 0,
            Error::InvalidPoolLiquidityState
        );

        let deposit_product = (max_token_x_in as u128)
            .checked_mul(max_token_y_in as u128)
            .ok_or(Error::MathOverflow)?;
        let lp_shares_to_mint = integer_sqrt(deposit_product);
        require!(lp_shares_to_mint <= u64::MAX as u128, Error::MathOverflow);
        return Ok((lp_shares_to_mint as u64, max_token_x_in, max_token_y_in));
    }

    /*
    Any one-sided-zero reserve is an invalid pool state.
    Example invalid states:
    - token_x_reserve == 0 && token_y_reserve > 0
    - token_x_reserve > 0 && token_y_reserve == 0
    */
    require!(
        token_x_reserve > 0 && token_y_reserve > 0,
        Error::InvalidPoolLiquidityState
    );

    /*
    Non-bootstrap requires positive LP supply.
    */
    require!(
        total_lp_shares_supply > 0,
        Error::InvalidPoolLiquidityState
    );

    /*
    LP shares implied by token X budget alone.
    */
    let lp_shares_from_token_x_budget = (max_token_x_in as u128)
        .checked_mul(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(token_x_reserve as u128)
        .ok_or(Error::MathOverflow)?;

    /*
    LP shares implied by token Y budget alone.
    */
    let lp_shares_from_token_y_budget = (max_token_y_in as u128)
        .checked_mul(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(token_y_reserve as u128)
        .ok_or(Error::MathOverflow)?;

    /*
    Limiting side wins. This preserves current reserve ratio.
    */
    let lp_shares_to_mint =
        lp_shares_from_token_x_budget.min(lp_shares_from_token_y_budget);
    require!(
        lp_shares_to_mint > 0 && lp_shares_to_mint <= u64::MAX as u128,
        Error::InvalidLiquidityAmount
    );

    /*
    Convert minted LP shares back to exact token X required.
    */
    let token_x_to_deposit = lp_shares_to_mint
        .checked_mul(token_x_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    /*
    Convert minted LP shares back to exact token Y required.
    */
    let token_y_to_deposit = lp_shares_to_mint
        .checked_mul(token_y_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    /*
    Return LP shares plus balanced token usage.
    */
    Ok((
        lp_shares_to_mint as u64,
        token_x_to_deposit as u64,
        token_y_to_deposit as u64,
    ))
}
