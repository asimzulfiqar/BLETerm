const { spawn } = require("child_process");
const path = require("path");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronCli = path.join(__dirname, "..", "node_modules", "electron", "cli.js");
const child = spawn(process.execPath, [electronCli, "."], {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
