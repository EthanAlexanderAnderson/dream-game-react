const { spawn } = require("child_process");
const path = require("path");

const nodemon = require.resolve("nodemon/bin/nodemon.js");
const child = spawn(process.execPath, [nodemon, "index.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
        ...process.env,
        REDIS_ENV_FILE: ".env.local"
    },
    stdio: "inherit"
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
    } else {
        process.exit(code === null ? 1 : code);
    }
});
