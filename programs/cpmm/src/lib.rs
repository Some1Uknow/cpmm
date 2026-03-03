use anchor_lang::prelude::*;

pub mod errors;
pub mod constants;
pub mod instructions;
pub mod state;
pub mod utils;

pub use constants::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;
pub use utils::*;

declare_id!("CmnAoRD5Vm9PvcoqMecWbBYg6p8AVhkptbHjsXNACys5");

#[program]
pub mod cpmm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
}