const fs = require("fs");

const extractQuestionsToCSV = (data) => {
  const results = [];

  // Process each page
  data.pages.forEach((page) => {
    // Add the page title
    if (page.title) {
      results.push({
        title: page.title,
        name: "page_title",
      });
    }

    // Process components in each page
    if (page.components && Array.isArray(page.components)) {
      page.components.forEach((component) => {
        // Only add if it's a field type component (not Para)
        if (component.type && component.type.includes("Field")) {
          results.push({
            title: component.title || "",
            name: component.name || "",
          });
        }
      });
    }
  });

  const csvHeader = "Title,Name\n";
  const csvRows = results
    .map(
      (row) =>
        `"${row.title.replace(/"/g, '""')}","${row.name.replace(/"/g, '""')}"`
    )
    .join("\n");

  return csvHeader + csvRows;
};

try {
  // Read the JSON file
  const rawData = fs.readFileSync(
    "./runner/src/server/forms/ReportAnOutbreak.json",
    "utf8"
  );
  const jsonData = JSON.parse(rawData);

  const csv = extractQuestionsToCSV(jsonData);
  fs.writeFileSync("questions.csv", csv);
  console.log("CSV file has been created!");

  // Debug output
  console.log("Number of pages processed:", jsonData.pages.length);
  console.log("CSV content preview:");
  console.log(csv.substring(0, 500)); // Show first 500 chars of the CSV
} catch (error) {
  console.error("Error:", error);
}
