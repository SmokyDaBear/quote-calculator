/**
 *
 * @param {*} data - Array of objects to be exported as CSV
 * @param {*} filename - Optional filename for the downloaded CSV file (default: "data.csv")
 * @returns Triggers a download of the CSV file containing the provided data
 * 
 * 
 * Example usage:
 * 
 * const sampleData = [
 *   { name: "Alice", age: 30, city: "New York" },
 *  { name: "Bob", age: 25, city: "Los Angeles" },
 * ];
 * 
 * exportToCSV(sampleData, "users.csv");
 */
export function exportToCSV(data, filename = "data.csv") {
  const keys = Object.keys(data[0]);
  const rows = data.map((item) => keys.map((key) => item[key]));
  const csvData = [keys, ...rows];
  const csvContent = csvData
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


/**
 * 
 * @param {*} file - file uploaded to be parsed
 * @returns Array of Objects 
 * 
 * Allows a user to upload a CSV file containing data which is parsed to an object whose keys are the first row (headers) of the file
 */
export function uploadCSV(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const headers = lines[0]
      .split(",")
      .map((header) => header.replace(/"/g, "").trim());
    const data = lines.slice(1).map((line) => {
      const values = line
        .split(",")
        .map((value) => value.replace(/"/g, "").trim());
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index];
      });
      return item;
    });
    onDataLoaded(data);
  };
  reader.readAsText(file);
}
