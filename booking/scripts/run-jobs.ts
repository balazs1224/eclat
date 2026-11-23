import "./load-env";
import { runJobs } from "../src/lib/jobs";
import { pool } from "../src/lib/db";

runJobs()
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool().end());
