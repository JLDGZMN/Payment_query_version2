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
