use anchor_lang::prelude::*;

use crate::errors::Error;

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

pub fn compute_bootstrap_lp_shares_to_mint(
    token_x_reserve: u64,
    token_y_reserve: u64,
    token_x_in: u64,
    token_y_in: u64,
) -> Result<u64> {
    if token_x_reserve != 0 || token_y_reserve != 0 {
        return err!(Error::NonBootstrapNotImplemented);
    }

    let deposit_product = (token_x_in as u128)
        .checked_mul(token_y_in as u128)
        .ok_or(Error::MathOverflow)?;

    let lp_shares_to_mint = integer_sqrt(deposit_product);
    require!(lp_shares_to_mint <= u64::MAX as u128, Error::MathOverflow);
    Ok(lp_shares_to_mint as u64)
}

fn integer_sqrt(n: u128) -> u128 {
    if n < 2 {
        return n;
    }

    let mut x0 = n / 2;
    let mut x1 = (x0 + n / x0) / 2;

    while x1 < x0 {
        x0 = x1;
        x1 = (x0 + n / x0) / 2;
    }

    x0
}

pub fn compute_lp_shares_and_token_deposit_amounts(
    token_x_reserve: u64,
    token_y_reserve: u64,
    total_lp_shares_supply: u64,
    max_token_x_in: u64,
    max_token_y_in: u64,
) -> Result<(u64, u64, u64)> {
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

    require!(
        token_x_reserve > 0 && token_y_reserve > 0,
        Error::InvalidPoolLiquidityState
    );

    require!(total_lp_shares_supply > 0, Error::InvalidPoolLiquidityState);

    let lp_shares_from_token_x_budget = (max_token_x_in as u128)
        .checked_mul(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(token_x_reserve as u128)
        .ok_or(Error::MathOverflow)?;

    let lp_shares_from_token_y_budget = (max_token_y_in as u128)
        .checked_mul(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(token_y_reserve as u128)
        .ok_or(Error::MathOverflow)?;

    let lp_shares_to_mint = lp_shares_from_token_x_budget.min(lp_shares_from_token_y_budget);
    require!(
        lp_shares_to_mint > 0 && lp_shares_to_mint <= u64::MAX as u128,
        Error::InvalidLiquidityAmount
    );

    let token_x_to_deposit = lp_shares_to_mint
        .checked_mul(token_x_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    let token_y_to_deposit = lp_shares_to_mint
        .checked_mul(token_y_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    Ok((
        lp_shares_to_mint as u64,
        token_x_to_deposit as u64,
        token_y_to_deposit as u64,
    ))
}

pub fn compute_withdraw_amounts(
    token_x_reserve: u64,
    token_y_reserve: u64,
    total_lp_shares_supply: u64,
    lp_shares_to_burn: u64,
) -> Result<(u64, u64)> {
    require!(lp_shares_to_burn > 0, Error::InvalidLiquidityAmount);
    require!(
        token_x_reserve > 0 && token_y_reserve > 0,
        Error::InvalidPoolLiquidityState
    );
    require!(total_lp_shares_supply > 0, Error::InvalidPoolLiquidityState);
    require!(
        lp_shares_to_burn <= total_lp_shares_supply,
        Error::InvalidLiquidityAmount
    );

    let token_x_out = (lp_shares_to_burn as u128)
        .checked_mul(token_x_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    let token_y_out = (lp_shares_to_burn as u128)
        .checked_mul(token_y_reserve as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(total_lp_shares_supply as u128)
        .ok_or(Error::MathOverflow)?;

    require!(
        token_x_out > 0 && token_y_out > 0,
        Error::InvalidLiquidityAmount
    );
    require!(token_x_out <= u64::MAX as u128, Error::MathOverflow);
    require!(token_y_out <= u64::MAX as u128, Error::MathOverflow);

    Ok((token_x_out as u64, token_y_out as u64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bootstrap_mints_geometric_mean_and_uses_full_budget() {
        let (lp_shares_to_mint, token_x_to_deposit, token_y_to_deposit) =
            compute_lp_shares_and_token_deposit_amounts(0, 0, 0, 100, 400).unwrap();

        assert_eq!(lp_shares_to_mint, 200);
        assert_eq!(token_x_to_deposit, 100);
        assert_eq!(token_y_to_deposit, 400);
    }

    #[test]
    fn bootstrap_rejects_non_zero_lp_supply() {
        let result = compute_lp_shares_and_token_deposit_amounts(0, 0, 1, 100, 400);
        assert!(result.is_err());
    }

    #[test]
    fn non_bootstrap_uses_limiting_side_and_preserves_ratio() {
        let (lp_shares_to_mint, token_x_to_deposit, token_y_to_deposit) =
            compute_lp_shares_and_token_deposit_amounts(1_000, 2_000, 100, 100, 300).unwrap();

        assert_eq!(lp_shares_to_mint, 10);
        assert_eq!(token_x_to_deposit, 100);
        assert_eq!(token_y_to_deposit, 200);
    }

    #[test]
    fn non_bootstrap_rejects_one_sided_zero_reserve() {
        let result = compute_lp_shares_and_token_deposit_amounts(1_000, 0, 100, 100, 100);
        assert!(result.is_err());
    }

    #[test]
    fn non_bootstrap_rejects_zero_lp_supply() {
        let result = compute_lp_shares_and_token_deposit_amounts(1_000, 2_000, 0, 100, 200);
        assert!(result.is_err());
    }
}
