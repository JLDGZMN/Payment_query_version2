import { createPool } from "mysql2/promise";
import { readFileSync } from "fs";

// Load .env manually
const env = readFileSync(new URL("../.env", import.meta.url), "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const pool = createPool(process.env.DATABASE_URL);

const sql = `
CREATE TABLE IF NOT EXISTS \`user\` (
  \`id\`            VARCHAR(36)   NOT NULL,
  \`name\`          VARCHAR(255)  NOT NULL,
  \`email\`         VARCHAR(255)  NOT NULL UNIQUE,
  \`emailVerified\` BOOLEAN       NOT NULL DEFAULT FALSE,
  \`image\`         VARCHAR(255),
  \`createdAt\`     DATETIME      NOT NULL,
  \`updatedAt\`     DATETIME      NOT NULL,
  \`username\`      VARCHAR(255)  UNIQUE,
  \`displayUsername\` VARCHAR(255),
  PRIMARY KEY (\`id\`)
);

CREATE TABLE IF NOT EXISTS \`session\` (
  \`id\`          VARCHAR(36)   NOT NULL,
  \`expiresAt\`   DATETIME      NOT NULL,
  \`token\`       VARCHAR(255)  NOT NULL UNIQUE,
  \`createdAt\`   DATETIME      NOT NULL,
  \`updatedAt\`   DATETIME      NOT NULL,
  \`ipAddress\`   VARCHAR(255),
  \`userAgent\`   TEXT,
  \`userId\`      VARCHAR(36)   NOT NULL,
  PRIMARY KEY (\`id\`),
  FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS \`account\` (
  \`id\`                     VARCHAR(36)   NOT NULL,
  \`accountId\`              VARCHAR(255)  NOT NULL,
  \`providerId\`             VARCHAR(255)  NOT NULL,
  \`userId\`                 VARCHAR(36)   NOT NULL,
  \`accessToken\`            TEXT,
  \`refreshToken\`           TEXT,
  \`idToken\`                TEXT,
  \`accessTokenExpiresAt\`   DATETIME,
  \`refreshTokenExpiresAt\`  DATETIME,
  \`scope\`                  VARCHAR(255),
  \`password\`               TEXT,
  \`createdAt\`              DATETIME      NOT NULL,
  \`updatedAt\`              DATETIME      NOT NULL,
  PRIMARY KEY (\`id\`),
  FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS \`verification\` (
  \`id\`           VARCHAR(36)   NOT NULL,
  \`identifier\`   VARCHAR(255)  NOT NULL,
  \`value\`        VARCHAR(255)  NOT NULL,
  \`expiresAt\`    DATETIME      NOT NULL,
  \`createdAt\`    DATETIME,
  \`updatedAt\`    DATETIME,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE IF NOT EXISTS \`payments\` (
  \`id\`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  \`or_date\`     DATE           NOT NULL,
  \`or_no_start\` VARCHAR(50)    NOT NULL,
  \`or_no_end\`   VARCHAR(50)    NOT NULL,
  \`pieces\`      INT UNSIGNED   NOT NULL,
  \`rcd_amount\`  DECIMAL(12,2)  NOT NULL,
  \`collector\`   VARCHAR(255)   NOT NULL,
  \`status\` ENUM('Active', 'Void') NOT NULL DEFAULT 'Active',
  \`voided_at\` DATETIME NULL,
  \`voided_by_user_id\` VARCHAR(36) NULL,
  \`created_by_user_id\` VARCHAR(36),
  \`updated_by_user_id\` VARCHAR(36),
  \`created_at\`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`payments_created_by_user_fk\`
    FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`payments_updated_by_user_fk\`
    FOREIGN KEY (\`updated_by_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
);
`;

// Columns to ensure exist on already-created tables: [table, column, definition]
const alterations = [
  ["payments", "status", "ENUM('Active', 'Void') NOT NULL DEFAULT 'Active'"],
  ["payments", "voided_at", "DATETIME NULL"],
  ["payments", "voided_by_user_id", "VARCHAR(36) NULL"],
  ["user", "username",        "VARCHAR(255) UNIQUE"],
  ["user", "displayUsername", "VARCHAR(255)"],
  ["payments", "created_by_user_id", "VARCHAR(36) NULL"],
  ["payments", "updated_by_user_id", "VARCHAR(36) NULL"],
];

const constraints = [
  ["payments", "payments_voided_by_user_fk", "FOREIGN KEY (`voided_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL"],
  [
    "payments",
    "payments_created_by_user_fk",
    "FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL",
  ],
  [
    "payments",
    "payments_updated_by_user_fk",
    "FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL",
  ],
];

async function columnExists(conn, table, column) {
  const db = process.env.DATABASE_URL.split("/").pop().split("?")[0];
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]
  );
  return rows.length > 0;
}

async function constraintExists(conn, table, constraint) {
  const db = process.env.DATABASE_URL.split("/").pop().split("?")[0];
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [db, table, constraint]
  );
  return rows.length > 0;
}

const conn = await pool.getConnection();
try {
  for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await conn.query(statement);
    const match = statement.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
    if (match) console.log(`✓ Table "${match[1]}" ready`);
  }

  // Add any missing columns to existing tables
  for (const [table, column, definition] of alterations) {
    if (!(await columnExists(conn, table, column))) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`✓ Added column "${column}" to "${table}"`);
    }
  }

  for (const [table, constraint, definition] of constraints) {
    if (!(await constraintExists(conn, table, constraint))) {
      await conn.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` ${definition}`);
      console.log(`Added constraint "${constraint}" to "${table}"`);
    }
  }

  console.log("\nMigration complete.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  conn.release();
  await pool.end();
}
