# SQL Commands for Payment Query

This file collects the SQL used by this project based on [scripts/migrate.mjs](/abs/path/c:/Users/A/Desktop/PQV2/Payment_query_version2/scripts/migrate.mjs:1) and the payment API routes in `app/api/payments`.

## 1. Create the database

```sql
CREATE DATABASE IF NOT EXISTS `payment_query`;
USE `payment_query`;
```

## 2. Create all required tables

Run these in order:

```sql
CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `emailVerified` BOOLEAN NOT NULL DEFAULT FALSE,
  `image` VARCHAR(255),
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `username` VARCHAR(255) UNIQUE,
  `displayUsername` VARCHAR(255),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `session` (
  `id` VARCHAR(36) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `ipAddress` VARCHAR(255),
  `userAgent` TEXT,
  `userId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `account` (
  `id` VARCHAR(36) NOT NULL,
  `accountId` VARCHAR(255) NOT NULL,
  `providerId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `accessToken` TEXT,
  `refreshToken` TEXT,
  `idToken` TEXT,
  `accessTokenExpiresAt` DATETIME,
  `refreshTokenExpiresAt` DATETIME,
  `scope` VARCHAR(255),
  `password` TEXT,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` VARCHAR(36) NOT NULL,
  `identifier` VARCHAR(255) NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `or_date` DATE NOT NULL,
  `or_no_start` VARCHAR(50) NOT NULL,
  `or_no_end` VARCHAR(50) NOT NULL,
  `pieces` INT UNSIGNED NOT NULL,
  `rcd_amount` DECIMAL(12,2) NOT NULL,
  `collector` VARCHAR(255) NOT NULL,
  `created_by_user_id` VARCHAR(36),
  `updated_by_user_id` VARCHAR(36),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `payments_created_by_user_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_updated_by_user_fk`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
```

## 3. Upgrade commands for older databases

If your tables already exist from an older version of the project, these are the extra migration commands the app expects:

```sql
ALTER TABLE `user`
ADD COLUMN `username` VARCHAR(255) UNIQUE;

ALTER TABLE `user`
ADD COLUMN `displayUsername` VARCHAR(255);

ALTER TABLE `payments`
ADD COLUMN `created_by_user_id` VARCHAR(36) NULL;

ALTER TABLE `payments`
ADD COLUMN `updated_by_user_id` VARCHAR(36) NULL;

ALTER TABLE `payments`
ADD CONSTRAINT `payments_created_by_user_fk`
FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;

ALTER TABLE `payments`
ADD CONSTRAINT `payments_updated_by_user_fk`
FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;
```

## 4. Payment queries used by the app

### List payments

```sql
SELECT
  p.id,
  p.or_date,
  p.or_no_start,
  p.or_no_end,
  p.pieces,
  p.rcd_amount,
  p.collector,
  p.created_at,
  p.updated_at,
  p.created_by_user_id,
  p.updated_by_user_id,
  creator.name AS created_by_name,
  creator.username AS created_by_username,
  updater.name AS updated_by_name,
  updater.username AS updated_by_username
FROM payments p
LEFT JOIN `user` creator ON creator.id = p.created_by_user_id
LEFT JOIN `user` updater ON updater.id = p.updated_by_user_id
ORDER BY p.or_date DESC, p.id DESC;
```

### Get one payment by ID

```sql
SELECT
  p.id,
  p.or_date,
  p.or_no_start,
  p.or_no_end,
  p.pieces,
  p.rcd_amount,
  p.collector,
  p.created_at,
  p.updated_at,
  p.created_by_user_id,
  p.updated_by_user_id,
  creator.name AS created_by_name,
  creator.username AS created_by_username,
  updater.name AS updated_by_name,
  updater.username AS updated_by_username
FROM payments p
LEFT JOIN `user` creator ON creator.id = p.created_by_user_id
LEFT JOIN `user` updater ON updater.id = p.updated_by_user_id
WHERE p.id = ?;
```

### Check overlapping O.R. range before insert

```sql
SELECT id, or_no_start, or_no_end
FROM payments
WHERE CAST(or_no_start AS UNSIGNED) <= CAST(? AS UNSIGNED)
  AND CAST(or_no_end AS UNSIGNED) >= CAST(? AS UNSIGNED)
LIMIT 1;
```

### Insert payment

```sql
INSERT INTO `payments`
(`or_date`, `or_no_start`, `or_no_end`, `pieces`, `rcd_amount`, `collector`, `created_by_user_id`, `updated_by_user_id`)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
```

### Check overlapping O.R. range before update

```sql
SELECT id, or_no_start, or_no_end
FROM payments
WHERE id != ?
  AND CAST(or_no_start AS UNSIGNED) <= CAST(? AS UNSIGNED)
  AND CAST(or_no_end AS UNSIGNED) >= CAST(? AS UNSIGNED)
LIMIT 1;
```

### Update payment

```sql
UPDATE `payments`
SET `or_date` = ?,
    `or_no_start` = ?,
    `or_no_end` = ?,
    `pieces` = ?,
    `rcd_amount` = ?,
    `collector` = ?,
    `updated_by_user_id` = ?
WHERE `id` = ?;
```

### Delete payment

```sql
DELETE FROM `payments`
WHERE `id` = ?;
```

## 5. Optional helper checks

These are useful if you want to verify the schema manually.

```sql
SHOW TABLES;

DESCRIBE `user`;
DESCRIBE `session`;
DESCRIBE `account`;
DESCRIBE `verification`;
DESCRIBE `payments`;
```
