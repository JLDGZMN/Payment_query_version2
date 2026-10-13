USE `payment_query`;

-- 1. Show all payments sorted by newest O.R. date first.
SELECT *
FROM `payments`
ORDER BY `or_date` DESC, `id` DESC;

-- 2. Show payments collected by Alice Dela Cruz.
SELECT `id`, `or_date`, `collector`, `rcd_amount`
FROM `payments`
WHERE `collector` = 'Alice Dela Cruz';

-- 3. Show payments with received amount greater than 3000.
SELECT `id`, `or_date`, `or_no_start`, `or_no_end`, `rcd_amount`
FROM `payments`
WHERE `rcd_amount` > 3000
ORDER BY `rcd_amount` DESC;
