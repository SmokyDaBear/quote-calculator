export function exportToCSV(data: Record<string, unknown>[], filename = "data.csv"): void {
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

export function uploadCSV(
  file: File,
  onDataLoaded: (data: Record<string, string>[]) => void,
): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = (event.target?.result ?? "") as string;
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const headers = lines[0]
      .split(",")
      .map((header) => header.replace(/"/g, "").trim());
    const data = lines.slice(1).map((line) => {
      const values = line
        .split(",")
        .map((value) => value.replace(/"/g, "").trim());
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header] = values[index];
      });
      return item;
    });
    onDataLoaded(data);
  };
  reader.readAsText(file);
}
