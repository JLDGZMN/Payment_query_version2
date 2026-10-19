CREATE DATABASE IF NOT EXISTS `payment_query`;
USE `payment_query`;

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
  `status` ENUM('Active', 'Void') NOT NULL DEFAULT 'Active',
  `voided_at` DATETIME NULL,
  `voided_by_user_id` VARCHAR(36) NULL,
  `created_by_user_id` VARCHAR(36),
  `updated_by_user_id` VARCHAR(36),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `payments_created_by_user_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_updated_by_user_fk`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_voided_by_user_fk`
    FOREIGN KEY (`voided_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `payment_corrections` (
  `replacement_payment_id` INT UNSIGNED NOT NULL,
  `voided_payment_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`replacement_payment_id`, `voided_payment_id`),
  INDEX `payment_corrections_original_idx` (`voided_payment_id`, `replacement_payment_id`),
  CONSTRAINT `payment_corrections_replacement_fk`
    FOREIGN KEY (`replacement_payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payment_corrections_original_fk`
    FOREIGN KEY (`voided_payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;
