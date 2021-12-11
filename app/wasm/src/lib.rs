mod utils;

use js_sys::Array;
use sudoku::Sudoku;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn solve(grid_digits: &Array) -> Option<Array> {
    let line = grid_digits
        .to_vec()
        .into_iter()
        .map(|d| match d.as_f64().unwrap_or(0.0) {
            d if d < 1.0 => String::from("."), // floating-point types cannot be used in patterns
            d => d.to_string(),
        })
        .collect::<Vec<String>>()
        .join("");
    match Sudoku::from_str_line(&line) {
        Ok(sudoku) => sudoku.solve_one().map(|solution| {
            solution
                .to_bytes()
                .iter()
                .map(|d| JsValue::from(*d as u32))
                .collect()
        }),
        Err(_) => None,
    }
}
