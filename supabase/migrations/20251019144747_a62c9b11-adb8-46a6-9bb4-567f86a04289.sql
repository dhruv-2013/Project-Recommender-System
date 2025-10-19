-- Delete all existing teams and their members
DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams);
DELETE FROM teams;