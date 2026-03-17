-- Seed data for IPL 2026 - run after migrations
-- Replace SEASON_ID with actual UUID from seasons insert

INSERT INTO seasons (name, start_date, end_date) 
VALUES ('IPL 2026', '2026-03-22', '2026-06-01')
RETURNING id;

-- After getting season id, run (replace YOUR_SEASON_ID):
/*
INSERT INTO participants (season_id, name, nickname, dream11_team_name, sort_order) VALUES
('YOUR_SEASON_ID', 'Himanshu', 'HK', 'HKALVA11', 1),
('YOUR_SEASON_ID', 'Ravi A', 'RA', 'ScavengerX1', 2),
('YOUR_SEASON_ID', 'Subba', 'SK', 'Koneti Super 11', 3),
('YOUR_SEASON_ID', 'Gnanesh', 'GN', 'Hyderabadi Hawa', 4),
('YOUR_SEASON_ID', 'Milind', 'MJ', 'DRPRA906ST', 5),
('YOUR_SEASON_ID', 'Umesh', 'UP', 'Rebel Assassin', 6),
('YOUR_SEASON_ID', 'Nilesh', 'NV', 'Nilesh9391FG', 7),
('YOUR_SEASON_ID', 'Surya', 'SM', 'Smash HitXI', 8),
('YOUR_SEASON_ID', 'Ravi P', 'RP', 'Hitcheeku', 9),
('YOUR_SEASON_ID', 'Sanjay', 'SB', 'Sanjay Strikers', 10),
('YOUR_SEASON_ID', 'Biswajit', 'BD', 'dasbiswajit', 11),
('YOUR_SEASON_ID', 'Rohan', 'RO', 'RonsXI11', 12);

INSERT INTO payout_config (season_id, phase, position_1st, position_2nd, position_3rd, position_4th, position_5th) VALUES
('YOUR_SEASON_ID', 'round_robin', 5, 4, 3, 2, 1),
('YOUR_SEASON_ID', 'knockout', 23, 18, 13, 7, 5),
('YOUR_SEASON_ID', 'final', 24, 18, 14, 10, 6);
*/
