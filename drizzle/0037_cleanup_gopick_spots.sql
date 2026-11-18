-- Migration 0037: Clean up legacy demo spots A01-A10 and enforce approved 65-slot GoPick layout
DELETE FROM parking_spots 
WHERE tenant='gopick' 
  AND code LIKE 'A%' 
  AND id NOT IN (SELECT spot_id FROM parking_tickets WHERE tenant='gopick');

-- Normalize row_index and col_index for GoPick P01-P65
UPDATE parking_spots SET row_index=1, col_index=CAST(SUBSTR(code, 2) AS INTEGER), section='Dãy chéo P1' WHERE tenant='gopick' AND code BETWEEN 'P01' AND 'P09';
UPDATE parking_spots SET row_index=2, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 9, section='Dãy P2' WHERE tenant='gopick' AND code BETWEEN 'P10' AND 'P20';
UPDATE parking_spots SET row_index=3, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 20, section='Dãy P3' WHERE tenant='gopick' AND code BETWEEN 'P21' AND 'P31';
UPDATE parking_spots SET row_index=4, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 31, section='Dãy P4' WHERE tenant='gopick' AND code BETWEEN 'P32' AND 'P42';
UPDATE parking_spots SET row_index=5, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 42, section='Dãy P5' WHERE tenant='gopick' AND code BETWEEN 'P43' AND 'P53';
UPDATE parking_spots SET row_index=6, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 53, section='Dãy P6' WHERE tenant='gopick' AND code BETWEEN 'P54' AND 'P65';
