use anchor_lang::prelude::*;

use crate::errors::CpmmError;

pub fn order_mints(a: Pubkey, b: Pubkey) -> (Pubkey, Pubkey) {
    if a.to_bytes() < b.to_bytes() {
        (a, b)
    } else {
        (b, a)
    }
}

pub fn require_canonical_mints(mint_x: Pubkey, mint_y: Pubkey) -> Result<()> {
    require_keys_neq!(mint_x, mint_y, CpmmError::IdenticalMints);
    require!(
        mint_x.to_bytes() < mint_y.to_bytes(),
        CpmmError::NonCanonicalMintOrder
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_mints_is_canonical() {
        let a = Pubkey::new_unique();
        let b = Pubkey::new_unique();

        let (x1, y1) = order_mints(a, b);
        let (x2, y2) = order_mints(b, a);

        assert_eq!((x1, y1), (x2, y2));
        assert!(x1.to_bytes() < y1.to_bytes());
    }
}
