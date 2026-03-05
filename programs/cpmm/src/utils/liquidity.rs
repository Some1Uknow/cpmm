use anchor_lang::prelude::*;

use crate::errors::Error;

pub fn validate_add_liquidity_inputs(amount_x: u64, amount_y: u64, min_lp_out: u64) -> Result<()> {
    require!(amount_x > 0 && amount_y > 0, Error::InvalidLiquidityAmount);
    require!(min_lp_out > 0, Error::InvalidMinLpOut);
    Ok(())
}

pub fn compute_bootstrap_lp_to_mint(
    reserve_x: u64,
    reserve_y: u64,
    amount_x: u64,
    amount_y: u64,
) -> Result<u64> {
    if reserve_x != 0 || reserve_y != 0 {
        return err!(Error::NonBootstrapNotImplemented);
    }

    let product = (amount_x as u128)
        .checked_mul(amount_y as u128)
        .ok_or(Error::MathOverflow)?;

    let sqrt = integer_sqrt(product);
    require!(sqrt <= u64::MAX as u128, Error::MathOverflow);
    Ok(sqrt as u64)
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
