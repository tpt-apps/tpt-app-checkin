//! WASM bindings for TPT Check-in — an offline event check-in / ticket
//! scanning app built on the
//! [`tpt-barcode`](https://github.com/tpt-solutions/tpt-barcode) engine.
//!
//! Exposes [`scan_rgba`] (decode a camera frame) plus a QR generator
//! ([`encode_qr_svg`]) used for the optional "generate a test ticket"
//! helper in the UI.

use tpt_barcode::core::{DecodeError, EcLevel, Format};
use tpt_barcode::prelude::*;
use wasm_bindgen::prelude::*;

fn js_err<E: core::fmt::Display>(err: E) -> JsValue {
    JsValue::from_str(&err.to_string())
}

fn parse_ec_level(level: &str) -> Result<EcLevel, JsValue> {
    match level.to_ascii_uppercase().as_str() {
        "L" => Ok(EcLevel::L),
        "M" => Ok(EcLevel::M),
        "Q" => Ok(EcLevel::Q),
        "H" => Ok(EcLevel::H),
        other => Err(JsValue::from_str(&format!(
            "invalid EC level '{other}': expected one of L, M, Q, H"
        ))),
    }
}

/// Encode `text` as a QR Code and render it to a self-contained SVG string.
#[wasm_bindgen]
pub fn encode_qr_svg(text: &str, ec_level: &str, module_size: u32) -> Result<String, JsValue> {
    let ec = parse_ec_level(ec_level)?;
    let qr = tpt_barcode::qr::encode(text, ec).map_err(js_err)?;
    Ok(qr.to_svg_string(module_size))
}

/// A single decoded barcode, returned from [`scan_rgba`].
#[wasm_bindgen]
pub struct WasmScanResult {
    text: String,
    format: &'static str,
}

#[wasm_bindgen]
impl WasmScanResult {
    /// The decoded text payload (UTF-8) — the ticket ID for check-in use.
    #[wasm_bindgen(getter)]
    pub fn text(&self) -> String {
        self.text.clone()
    }

    /// The barcode symbology, e.g. `"QR Code"`.
    #[wasm_bindgen(getter)]
    pub fn format(&self) -> String {
        self.format.to_string()
    }
}

fn format_name(format: Format) -> &'static str {
    match format {
        Format::QrCode => "QR Code",
        Format::DataMatrix => "Data Matrix",
        Format::Pdf417 => "PDF417",
        Format::Code128 => "Code 128",
        Format::Ean13 => "EAN-13",
        Format::UpcA => "UPC-A",
        Format::Code39 => "Code 39",
    }
}

/// Scan an RGBA image buffer (e.g. straight from a `<canvas>` `ImageData`)
/// for a QR Code ticket. Internally converts to grayscale before scanning.
///
/// `pixels.len()` must equal `width * height * 4`. Returns an array of
/// [`WasmScanResult`] (empty if nothing was found this frame — not an error,
/// since this runs against a live camera feed).
#[wasm_bindgen]
pub fn scan_rgba(pixels: &[u8], width: u32, height: u32) -> Result<Vec<WasmScanResult>, JsValue> {
    let expected = (width as usize)
        .saturating_mul(height as usize)
        .saturating_mul(4);
    if pixels.len() != expected {
        return Err(JsValue::from_str(
            "scan_rgba: pixels.len() must equal width * height * 4",
        ));
    }

    let mut gray = Vec::with_capacity((width as usize) * (height as usize));
    for chunk in pixels.chunks_exact(4) {
        let (r, g, b) = (chunk[0] as u32, chunk[1] as u32, chunk[2] as u32);
        let y = (r * 299 + g * 587 + b * 114) / 1000;
        gray.push(y as u8);
    }

    let formats = [Format::QrCode];
    let results = tpt_barcode::scan(&gray, width as usize, height as usize)
        .formats(&formats)
        .try_harder(true)
        .execute();

    match results {
        Ok(hits) => Ok(hits
            .into_iter()
            .map(|r| WasmScanResult {
                text: r.text().to_string(),
                format: format_name(r.format()),
            })
            .collect()),
        Err(DecodeError::NotFound) => Ok(Vec::new()),
        Err(other) => Err(js_err(other)),
    }
}

/// Called once by the JS glue on module init; wires up panic messages to the
/// browser console so failures are easier to diagnose than a bare "unreachable".
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[cfg(test)]
mod tests {
    use super::*;

    /// End-to-end: encode a QR as SVG-backed matrix data via the public QR
    /// API, rasterize it to an RGBA buffer the way a `<canvas>` frame would
    /// look, and confirm `scan_rgba` decodes the same ticket ID back out.
    /// This is the actual code path the check-in scanner relies on.
    #[test]
    fn scan_rgba_round_trips_a_generated_ticket_qr() {
        let ticket_id = "TICKET-0042";
        let qr = tpt_barcode::qr::encode(ticket_id, EcLevel::M).unwrap();

        let module_px = 6u32;
        let quiet = 4u32;
        let padded = qr.size as u32 + 2 * quiet;
        let img_px = padded * module_px;

        let mut rgba = vec![255u8; (img_px * img_px * 4) as usize];
        for row in 0..qr.size as u32 {
            for col in 0..qr.size as u32 {
                if qr.matrix[(row * qr.size as u32 + col) as usize] != 0 {
                    let px_x = (quiet + col) * module_px;
                    let px_y = (quiet + row) * module_px;
                    for dy in 0..module_px {
                        for dx in 0..module_px {
                            let x = px_x + dx;
                            let y = px_y + dy;
                            let idx = ((y * img_px + x) * 4) as usize;
                            rgba[idx] = 0;
                            rgba[idx + 1] = 0;
                            rgba[idx + 2] = 0;
                            rgba[idx + 3] = 255;
                        }
                    }
                }
            }
        }

        let hits = scan_rgba(&rgba, img_px, img_px).expect("scan should not error");
        assert_eq!(hits.len(), 1, "expected exactly one QR hit");
        assert_eq!(hits[0].text(), ticket_id);
        assert_eq!(hits[0].format(), "QR Code");
    }
}
