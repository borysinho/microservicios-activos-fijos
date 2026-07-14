#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3').verbose();

const mode = process.argv[2];
const workflowNames = process.argv.slice(3);
const userFolder = process.env.N8N_USER_FOLDER || '/home/node/.n8n';
const databasePath = process.env.N8N_DATABASE_SQLITE_PATH || path.join(userFolder, 'database.sqlite');

if (!['dedupe', 'delete-all'].includes(mode)) {
  console.error('Usage: dedupe-workflows.js <dedupe|delete-all> <workflow-name>...');
  process.exit(2);
}

if (workflowNames.length === 0) {
  process.exit(0);
}

if (!fs.existsSync(databasePath)) {
  console.log(`MS4 n8n database not found at ${databasePath}; skipping workflow cleanup.`);
  process.exit(0);
}

const db = new sqlite3.Database(databasePath);

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });

const placeholders = (values) => values.map(() => '?').join(',');

async function deleteWorkflowIds(ids) {
  if (ids.length === 0) {
    return;
  }

  const marks = placeholders(ids);
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await run(`DELETE FROM webhook_entity WHERE workflowId IN (${marks})`, ids);
    await run(`UPDATE test_definition SET evaluationWorkflowId = NULL WHERE evaluationWorkflowId IN (${marks})`, ids);
    await run(`DELETE FROM workflow_entity WHERE id IN (${marks})`, ids);
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

async function main() {
  await run('PRAGMA foreign_keys = ON');

  const rows = await all(
    `SELECT id, name, createdAt, updatedAt
       FROM workflow_entity
      WHERE name IN (${placeholders(workflowNames)})
      ORDER BY name ASC, createdAt ASC, updatedAt ASC, id ASC`,
    workflowNames,
  );

  const idsToDelete = [];

  if (mode === 'delete-all') {
    idsToDelete.push(...rows.map((row) => row.id));
  } else {
    const seenNames = new Set();
    for (const row of rows) {
      if (!seenNames.has(row.name)) {
        seenNames.add(row.name);
        continue;
      }
      idsToDelete.push(row.id);
    }
  }

  if (idsToDelete.length === 0) {
    console.log(`MS4 workflow cleanup (${mode}): no duplicate seed workflows found.`);
    return;
  }

  await deleteWorkflowIds(idsToDelete);
  console.log(`MS4 workflow cleanup (${mode}): removed ${idsToDelete.length} seed workflow instance(s).`);
}

main()
  .catch((error) => {
    console.error(`MS4 workflow cleanup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
