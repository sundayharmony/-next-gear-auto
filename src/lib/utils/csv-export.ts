/**
 * CSV Export Utility
 * Converts arrays of objects to CSV format and enables browser downloads
 */

/**
 * Escapes a value for CSV format
 * - Wraps value in quotes if it contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if value contains special characters
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV string
 * @param data - Array of objects to convert
 * @param columns - Array of column names (in order). If not provided, uses all keys from first object
 * @returns CSV formatted string
 */
export function arrayToCSV<T extends Record<string, unknown>>(data: T[], columns?: (keyof T)[]): string {
  if (data.length === 0) {
    return "";
  }

  // Use provided columns or extract from first object
  const csvColumns = columns || (Object.keys(data[0]) as (keyof T)[]);

  // Create header row
  const header = csvColumns.map((col) => escapeCSVValue(String(col))).join(",");

  // Create data rows
  const rows = data.map((row) => {
    return csvColumns.map((col) => escapeCSVValue(row[col])).join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Downloads CSV data as a file in the browser
 * @param csvContent - CSV formatted string
 * @param filename - Name of the file to download (without .csv extension, will be added automatically)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add .csv extension if not present
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  // Create blob from CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create temporary URL for the blob
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", finalFilename);
  link.style.visibility = "hidden";

  // Add to DOM and trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Combined function: convert array to CSV and download
 * @param data - Array of objects to export
 * @param filename - Name of the file to download
 * @param columns - Array of column names (in order). If not provided, uses all keys from first object
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: (keyof T)[]
): void {
  const csvContent = arrayToCSV(data, columns);
  downloadCSV(csvContent, filename);
}
