USE `payment_query`;

-- 1. List payments together with the user who created and last updated each row.
SELECT
  p.id,
  p.or_date,
  p.or_no_start,
  p.or_no_end,
  p.collector,
  p.rcd_amount,
  creator.name AS created_by_name,
  updater.name AS updated_by_name
FROM `payments` p
LEFT JOIN `user` creator ON creator.id = p.created_by_user_id
LEFT JOIN `user` updater ON updater.id = p.updated_by_user_id
ORDER BY p.or_date DESC, p.id DESC;

-- 2. Show total payments and total amount per collector.
SELECT
  `collector`,
  COUNT(*) AS total_records,
  SUM(`pieces`) AS total_pieces,
  SUM(`rcd_amount`) AS total_amount
FROM `payments`
GROUP BY `collector`
ORDER BY total_amount DESC;

-- 3. Find payments made between June 2 and June 6, 2026.
SELECT
  `id`,
  `or_date`,
  `or_no_start`,
  `or_no_end`,
  `collector`,
  `rcd_amount`
FROM `payments`
WHERE `or_date` BETWEEN '2026-06-02' AND '2026-06-06'
ORDER BY `or_date`, `id`;

-- 4. Check whether a proposed O.R. range overlaps an existing payment range.
SELECT `id`, `or_no_start`, `or_no_end`
FROM `payments`
WHERE CAST(`or_no_start` AS UNSIGNED) <= CAST('1040' AS UNSIGNED)
  AND CAST(`or_no_end` AS UNSIGNED) >= CAST('1038' AS UNSIGNED)
LIMIT 1;
