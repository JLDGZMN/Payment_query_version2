USE `payment_query`;

-- 1. Rank collectors by total received amount using a window function.
SELECT
  collector,
  total_amount,
  DENSE_RANK() OVER (ORDER BY total_amount DESC) AS amount_rank
FROM (
  SELECT
    `collector`,
    SUM(`rcd_amount`) AS total_amount
  FROM `payments`
  GROUP BY `collector`
) ranked_collectors
ORDER BY amount_rank, collector;

-- 2. Show each payment together with the previous payment amount of the same collector.
SELECT
  `collector`,
  `or_date`,
  `id`,
  `rcd_amount`,
  LAG(`rcd_amount`) OVER (
    PARTITION BY `collector`
    ORDER BY `or_date`, `id`
  ) AS previous_amount
FROM `payments`
ORDER BY `collector`, `or_date`, `id`;

-- 3. Find payments whose amount is above the overall average payment amount.
SELECT
  p.id,
  p.or_date,
  p.collector,
  p.rcd_amount
FROM `payments` p
WHERE p.`rcd_amount` > (
  SELECT AVG(`rcd_amount`)
  FROM `payments`
)
ORDER BY p.`rcd_amount` DESC;
