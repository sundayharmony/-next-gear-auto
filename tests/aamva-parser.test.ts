import test from "node:test";
import assert from "node:assert/strict";
import { parseAamvaBarcode, parseAamvaDate, parseLicenseFrontText } from "../src/lib/license/aamva";

const NJ_SAMPLE =
  "@\n\u001e\rANSI 636036090002DL00410278ZN03290015DL" +
  "DAQH12345678901234\nDCSHOPSON\nDDEN\nDACJOHN\nDDFN\nDADMICHAEL\nDDGN\nDCAD\nDCBNONE\nDCDNONE\n" +
  "DBD01012024\nDBB04121990\nDBA04122030\nDBC1\nDAU070 IN\nDAYBRO\nDAG1 SAMPLE ST APT 4\nDAIJERSEY CITY\nDAJNJ\nDAK073040000\nDCF1234\nDCGUSA\n";

test("parses a U.S. AAMVA barcode", () => {
  const p = parseAamvaBarcode(NJ_SAMPLE);
  assert.ok(p);
  assert.equal(p.licenseNumber, "H12345678901234");
  assert.equal(p.dob, "1990-04-12");
  assert.equal(p.expires, "2030-04-12");
  assert.equal(p.firstName, "John");
  assert.equal(p.middleName, "Michael");
  assert.equal(p.lastName, "Hopson");
  assert.equal(p.addressLine, "1 Sample St Apt 4");
  assert.equal(p.city, "Jersey City");
  assert.equal(p.state, "NJ");
  assert.equal(p.licenseState, "NJ");
  assert.equal(p.zip, "07304-0000");
});

test("parses a barcode whose header runs into the first element", () => {
  const raw =
    "@\n\u001e\rANSI 636036090002DL00410278ZN03290015DLDCSHOPSON\nDACJOHN\nDBB04121990\nDBA04122030\nDAQH12345678901234\nDAG1 SAMPLE ST\nDAIJERSEY CITY\nDAJNJ\nDAK07304\nDCGUSA\n";
  const p = parseAamvaBarcode(raw);
  assert.ok(p);
  assert.equal(p.lastName, "Hopson");
  assert.equal(p.licenseNumber, "H12345678901234");
  assert.equal(p.dob, "1990-04-12");
  assert.equal(p.zip, "07304");
});

test("rejects text that is not an AAMVA payload", () => {
  assert.equal(parseAamvaBarcode("hello world"), null);
  assert.equal(parseAamvaBarcode(""), null);
});

test("date parsing handles U.S. and Canadian orders and bad input", () => {
  assert.equal(parseAamvaDate("04121990", "USA"), "1990-04-12");
  assert.equal(parseAamvaDate("19900412", "CAN"), "1990-04-12");
  assert.equal(parseAamvaDate("13451990", "USA"), null);
  assert.equal(parseAamvaDate("abc", "USA"), null);
});

test("front-of-card OCR text gives suggestions", () => {
  const p = parseLicenseFrontText(
    "NEW JERSEY\nDRIVER LICENSE\nDL H1234 56789 01234\nHOPSON JOHN M\n1 SAMPLE ST\nJERSEY CITY, NJ 07304\nDOB 04/12/1990\nEXP 04/12/2030\n",
  );
  assert.ok(p);
  assert.equal(p.dob, "1990-04-12");
  assert.equal(p.expires, "2030-04-12");
  assert.equal(p.licenseNumber, "H1234 56789 01234");
  assert.equal(p.addressLine, "1 Sample St");
  assert.equal(p.city, "Jersey City");
  assert.equal(p.zip, "07304");
});
