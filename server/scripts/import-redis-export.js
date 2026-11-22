const fs = require("fs");
const path = require("path");
const Redis = require("ioredis");

const exportPath = process.argv[2];
if (!exportPath) {
    console.error("Usage: yarn import-redis-export <path-to-export.txt>");
    process.exit(1);
}

const resolvedExportPath = path.resolve(exportPath);
if (!fs.existsSync(resolvedExportPath)) {
    console.error(`Redis export not found: ${resolvedExportPath}`);
    process.exit(1);
}

// Parse the text export into Redis key/value pairs before writing anything.
const lines = fs.readFileSync(resolvedExportPath, "utf8").split(/\r?\n/);
const records = [];
let currentRecord = null;
const localNames = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Abi", "Guest"];

for (const line of lines) {
    const match = line.match(/^([$%&][^:]*): ?(.*)$/);
    if (match) {
        if (currentRecord) {
            records.push(currentRecord);
        }
        currentRecord = { key: match[1], value: match[2] };
    } else if (line && currentRecord) {
        // The export contains one wrapped avatar URL. Join wrapped values without
        // introducing a newline into the Redis value.
        currentRecord.value += line.trim();
    } else if (line) {
        console.error(`Unrecognized export line: ${line.slice(0, 80)}`);
        process.exit(1);
    }
}

if (currentRecord) {
    records.push(currentRecord);
}

const duplicateKeys = records
    .map(({ key }) => key)
    .filter((key, index, keys) => keys.indexOf(key) !== index);
if (duplicateKeys.length > 0) {
    console.error(`Duplicate Redis keys found: ${[...new Set(duplicateKeys)].join(", ")}`);
    process.exit(1);
}

async function importRecords() {
    // Use a pipeline so the complete local dataset imports efficiently and
    // default player keys are created without overwriting exported values.
    const client = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
    try {
        await client.ping();
        const pipeline = client.pipeline();
        for (const { key, value } of records) {
            pipeline.set(key, value);
        }
        for (const name of localNames) {
            pipeline.setnx(`%${name}`, "0,0,0,0,0,0,0.00");
            pipeline.setnx(`$${name}`, "");
        }
        await pipeline.exec();
        console.log(`Imported ${records.length} Redis keys into ${process.env.REDIS_URL || "redis://127.0.0.1:6379"}.`);
    } finally {
        await client.quit();
    }
}

importRecords().catch((error) => {
    console.error(`Redis import failed: ${error.message}`);
    process.exitCode = 1;
});
