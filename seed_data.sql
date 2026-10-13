USE `payment_query`;

INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`, `username`, `displayUsername`)
VALUES
  ('usr-001', 'Alice Dela Cruz', 'alice@example.com', TRUE, NULL, '2026-06-01 08:00:00', '2026-06-01 08:00:00', 'alice', 'Alice'),
  ('usr-002', 'Brian Santos', 'brian@example.com', TRUE, NULL, '2026-06-01 08:10:00', '2026-06-01 08:10:00', 'brian', 'Brian'),
  ('usr-003', 'Carla Reyes', 'carla@example.com', FALSE, NULL, '2026-06-01 08:20:00', '2026-06-01 08:20:00', 'carla', 'Carla');

INSERT INTO `payments`
  (`or_date`, `or_no_start`, `or_no_end`, `pieces`, `rcd_amount`, `collector`, `created_by_user_id`, `updated_by_user_id`)
VALUES
  ('2026-06-01', '1001', '1010', 10, 2500.00, 'Alice Dela Cruz', 'usr-001', 'usr-001'),
  ('2026-06-02', '1011', '1020', 10, 3150.50, 'Brian Santos', 'usr-002', 'usr-002'),
  ('2026-06-03', '1021', '1035', 15, 4980.75, 'Carla Reyes', 'usr-003', 'usr-003'),
  ('2026-06-05', '1036', '1045', 10, 2875.25, 'Alice Dela Cruz', 'usr-001', 'usr-002'),
  ('2026-06-06', '1046', '1055', 10, 3520.00, 'Brian Santos', 'usr-002', 'usr-001'),
  ('2026-06-08', '1056', '1070', 15, 6150.90, 'Carla Reyes', 'usr-003', 'usr-002');
