const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.join(__dirname, "./");
const PROD_FORMS = [
  "ReportAnOutbreak.json",
  "feedback.json",
  "kls-enquiries.json",
  "kls-feedback.json",
  "kls-magic-link.json",
  "kls-training-magic-link.json",
  "kls-training-request.json",
  "magic-link.json",
];

function cleanNonProdForms() {
  console.log("[INFO] Starting cleanup in:", TARGET_DIR);

  let deletedCount = 0;
  let keptFiles = [];

  try {
    const files = fs.readdirSync(TARGET_DIR);
    console.log(`[INFO] Found ${files.length} files`);

    files.forEach((file) => {
      const filePath = path.join(TARGET_DIR, file);

      if (!PROD_FORMS.includes(file) && file.endsWith(".json")) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[INFO]: ${file} deleted`);
          deletedCount++;
        } catch (error) {
          console.error(`[ERROR] Failed to delete "${file}": ${error.message}`);
        }
      } else {
        keptFiles.push(file);
      }
    });

    console.log(`[INFO] Files not deleted:`);
    console.table(keptFiles);

    console.log(`[DONE] Cleanup complete. Deleted ${deletedCount}`);
  } catch (error) {
    console.error(`[ERROR] Could not read directory: ${error.message}`);
    process.exit(1);
  }
}

cleanNonProdForms();
