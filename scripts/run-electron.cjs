const { spawn } = require("child_process");
const path = require("path");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronCli = path.join(__dirname, "..", "node_modules", "electron", "cli.js");

// Electron 33 / Chromium 130 has a FATAL crash in partition_alloc_support.cc when
// V8Inspector connects (DevTools, VS Code debugger, etc.) while any Bluetooth code runs.
// Passing this flag at binary launch time (before PartitionAlloc initialises) is the
// only reliable way to disable the check — app.commandLine.appendSwitch() is too late.
const chromiumFlags = [
  "--disable-features=PartitionAllocUnretainedDanglingPtr"
];

const child = spawn(process.execPath, [electronCli, ...chromiumFlags, "."], {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
