PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0000_amazing_dreadnoughts.sql','2026-11-04 13:04:36');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0001_overconfident_sphinx.sql','2026-11-04 13:04:36');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0002_loving_machine_man.sql','2026-11-04 13:04:36');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0003_minor_lady_deathstrike.sql','2026-11-04 13:04:36');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0004_sturdy_ultimo.sql','2026-11-04 13:04:37');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0005_ancient_bloodstrike.sql','2026-11-04 13:04:37');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0006_crazy_spot.sql','2026-11-04 13:04:37');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(8,'0007_greedy_gabe_jones.sql','2026-11-04 13:29:39');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(9,'0008_curious_vance_astro.sql','2026-11-04 14:00:05');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(10,'0009_rapid_jimmy_woo.sql','2026-11-05 01:26:18');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(11,'0010_marvelous_plazm.sql','2026-11-05 10:59:13');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(12,'0011_worried_big_bertha.sql','2026-11-05 11:14:42');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(13,'0012_legal_screwball.sql','2026-11-05 13:44:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(14,'0013_fixed_the_santerians.sql','2026-11-05 14:24:49');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(15,'0014_silent_kitty_pryde.sql','2026-11-05 15:02:59');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(16,'0015_conscious_exiles.sql','2026-11-05 15:35:41');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(17,'0016_loud_vance_astro.sql','2026-11-05 16:29:17');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(18,'0017_bitter_puck.sql','2026-11-06 01:00:22');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(19,'0018_broken_radioactive_man.sql','2026-11-06 09:09:38');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(20,'0019_windy_celestials.sql','2026-11-06 10:10:19');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(21,'0020_orange_fantastic_four.sql','2026-11-06 17:04:02');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(22,'0021_great_kat_farrell.sql','2026-11-07 03:38:22');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(23,'0022_spooky_phalanx.sql','2026-11-07 05:32:28');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(24,'0023_burly_captain_cross.sql','2026-11-07 05:32:28');
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('2538ef46-6ec2-4943-9645-0092a7f869a2','golf3d-main','Cấu hình','Cập nhật thiết lập cơ sở',1793838839226);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('shift-open:4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','golf3d-main','Mở ca','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","name":"Ca làm việc","openingCash":0,"actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481"}',1793927606931);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('f8177a6a-e409-4879-a9ca-f852b6fd1736','golf3d-main','Đặt lịch','Line 02 · Phan Tiến Dũng',1793928883655);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('dbb73f99-4286-43f7-b069-ae4e0703765f','golf3d-main','Bắt đầu','2c1dd167-dda7-4599-9311-d74b62e5ec94',1793928899741);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('e545ac31-f746-4e2a-8302-97c94a7f2cd8','golf3d-main','Vào chơi ngay','Line 03 · Khách vãng lai',1793932235241);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('631e69ee-bf5c-4806-b8e5-0c0156e6b517','golf3d-main','Kết thúc','2c1dd167-dda7-4599-9311-d74b62e5ec94',1793940860504);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('finance:bdf195be-c96f-411c-a7e6-7b3ca24ca4e6','golf3d-main','Ghi sổ tiền','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","entry":"bdf195be-c96f-411c-a7e6-7b3ca24ca4e6","kind":"payment","method":"transfer","amount":514903,"booking":"2c1dd167-dda7-4599-9311-d74b62e5ec94","actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481","part":0}',1793940876501);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('1ba5b179-8054-4709-b0cf-8ff50bb0de59','golf3d-main','Kết thúc','1022457c-7e7c-4ec5-a876-28453eee7a90',1793940895369);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('finance:a6b6c9dd-0dd1-4b86-83d9-5ab783caf961','golf3d-main','Ghi sổ tiền','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","entry":"a6b6c9dd-0dd1-4b86-83d9-5ab783caf961","kind":"payment","method":"cash","amount":415649,"booking":"1022457c-7e7c-4ec5-a876-28453eee7a90","actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481","part":0}',1793940915198);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('dd55d961-c4a0-4cfa-8d74-1e85b82e909b','golf3d-main','Cấu hình','Cập nhật thiết lập cơ sở',1794020912564);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('package:0c30a546dec7b199e651e00b08b7ef4010a98f9c35cf7775553ae7013d2e2672','golf3d-main','Bán gói','{"package":"0c30a546dec7b199e651e00b08b7ef4010a98f9c35cf7775553ae7013d2e2672","customer":"5cfae54b-6ebb-4d09-94df-685944091454","name":"Gói tiêu chuẩn 10 giờ (+2 giờ tặng)","source":"sale","price":3000000,"actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481"}',1794041032624);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('finance:9f24d491-7963-4e84-b533-203e99386975','golf3d-main','Ghi sổ tiền','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","entry":"9f24d491-7963-4e84-b533-203e99386975","kind":"payment","method":"cash","amount":3000000,"booking":null,"actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481","part":0}',1794041032624);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('c54e01c9-0f38-477a-a4fc-e164a6e77a00','golf3d-main','Vào chơi ngay','Line 01 · Khách vãng lai',1794042058505);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('d5c5fa4f-2e8d-4c0c-a450-f84eaf741a1a','golf3d-main','Kết thúc','6a5b402c-7500-4a4c-ad68-685d95859225',1794042158633);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('finance:89d2cd97-7484-4bd7-9f8a-9a83c74e69a1','golf3d-main','Ghi sổ tiền','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","entry":"89d2cd97-7484-4bd7-9f8a-9a83c74e69a1","kind":"payment","method":"cash","amount":7648,"booking":"6a5b402c-7500-4a4c-ad68-685d95859225","actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481","part":0}',1794042168540);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('c903c88d-4c9b-46f2-9708-64b3aadca6e0','golf3d-main','Vào chơi ngay','Line 01 · Phan Tiến Dũng test',1794042857780);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('menu:2c92ae329d636d37e249aba7e7e2717705b88c96b0df75c99b800866fe571070:0','golf3d-main','Thêm món','{"item":"2c92ae329d636d37e249aba7e7e2717705b88c96b0df75c99b800866fe571070","name":"Nước suối Aqua","price":15000}',1794042964909);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('menu:41645e921ca29bf6361fc8ad7a198d6817bda798862d2ff249b6d68ddfdd2151:0','golf3d-main','Thêm món','{"item":"41645e921ca29bf6361fc8ad7a198d6817bda798862d2ff249b6d68ddfdd2151","name":"Bánh mỳ","price":5000}',1794042989685);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('2a4f0d5c-c356-49e4-9d15-544f97d1e4c3','golf3d-main','Kết thúc','de979280-ceb3-4895-882a-8fec00f970f9',1794044368612);
INSERT INTO "audit" ("id","tenant","action","detail","created") VALUES('finance:f5801414-47a1-439a-a0d5-191b772eb6fc','golf3d-main','Ghi sổ tiền','{"shift":"4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893","entry":"f5801414-47a1-439a-a0d5-191b772eb6fc","kind":"payment","method":"cash","amount":115407,"booking":"de979280-ceb3-4895-882a-8fec00f970f9","actor":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481","part":0}',1794044373913);
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`room` text NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`people` integer NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`status` text NOT NULL,
	`segments` text NOT NULL,
	`started` integer,
	`finished` integer,
	`amount` integer,
	`payment` text,
	`price` text NOT NULL,
	`created` integer NOT NULL
, `food_total` integer DEFAULT 0 NOT NULL, `golf_amount` integer);
INSERT INTO "bookings" ("id","tenant","room","customer","phone","service","people","start","end","status","segments","started","finished","amount","payment","price","created","food_total","golf_amount") VALUES('2c1dd167-dda7-4599-9311-d74b62e5ec94','golf3d-main','line-2','Phan Tiến Dũng','0777773893','gdr',1,1793929500000,1793941160433,'paid','[{"start":1793928899695,"end":1793940860433}]',NULL,1793940860433,514903,'transfer','{"config":{"name":"Saigon Golf 3D Club","address":"250 Lương Đình Của, Phường Bình Trưng, TP.HCM","open":"08:00","close":"23:00","vat":10,"fee":0,"capacity":4,"vipCapacity":4,"vipRate":null,"vipHappy":null,"rate":250000,"happy":100000,"hole9":[300000,0,0,900000],"hole18":[400000,0,0,1000000],"vip9":[0,0,0,0],"vip18":[0,0,0,0],"holeMinutes9":[0,0,0,0],"holeMinutes18":[0,0,0,0],"buffer":0,"clean":5,"vipClean":10,"days":2,"grace":15,"cancelHours":2,"published":false,"feeMode":"percent","feeServices":["gdr","9","18"],"bankBin":"","bankAccount":"","bankHolder":"","onlineEnabled":true,"onlineSlug":"saigon-golf","priceRules":[{"id":"standard-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"standard-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"standard-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"standard-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"standard-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"standard-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"standard-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"standard-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"vip-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"vip-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"vip-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"vip-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"vip-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"vip-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"vip-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true}],"holidays":[],"pricingRevision":"v06-official","offers":[],"promotions":[]},"base":0,"listBase":0,"promo":null,"vip":false,"version":2,"ruleId":null,"ruleLabel":null,"pricingRevision":"v06-official","estimated":{"lines":[{"date":"2026-11-06","label":"Giờ vàng T2–T6","minutes":60,"rate":100000,"amount":100000,"from":1793929500000,"to":1793933100000,"ruleId":"standard-gdr-0-weekday-08:00"}],"subtotal":100000,"fee":0,"vat":10000,"total":110000}}',1793928883617,0,514903);
INSERT INTO "bookings" ("id","tenant","room","customer","phone","service","people","start","end","status","segments","started","finished","amount","payment","price","created","food_total","golf_amount") VALUES('1022457c-7e7c-4ec5-a876-28453eee7a90','golf3d-main','line-3','Khách vãng lai','','gdr',1,1793932235202,1793941195303,'paid','[{"start":1793932235202,"end":1793940895303}]',NULL,1793940895303,415649,'cash','{"config":{"name":"Saigon Golf 3D Club","address":"250 Lương Đình Của, Phường Bình Trưng, TP.HCM","open":"08:00","close":"23:00","vat":10,"fee":0,"capacity":4,"vipCapacity":4,"vipRate":null,"vipHappy":null,"rate":250000,"happy":100000,"hole9":[300000,0,0,900000],"hole18":[400000,0,0,1000000],"vip9":[0,0,0,0],"vip18":[0,0,0,0],"holeMinutes9":[0,0,0,0],"holeMinutes18":[0,0,0,0],"buffer":0,"clean":5,"vipClean":10,"days":2,"grace":15,"cancelHours":2,"published":false,"feeMode":"percent","feeServices":["gdr","9","18"],"bankBin":"","bankAccount":"","bankHolder":"","onlineEnabled":true,"onlineSlug":"saigon-golf","priceRules":[{"id":"standard-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"standard-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"standard-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"standard-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"standard-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"standard-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"standard-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"standard-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"standard-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"standard-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"standard-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"vip-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"vip-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"vip-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"vip-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"vip-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"vip-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"vip-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true}],"holidays":[],"pricingRevision":"v06-official","offers":[],"promotions":[]},"base":0,"listBase":0,"promo":null,"vip":false,"version":2,"ruleId":null,"ruleLabel":null,"pricingRevision":"v06-official","estimated":{"lines":[{"date":"2026-11-06","label":"Giờ vàng T2–T6","minutes":60,"rate":100000,"amount":100000,"from":1793932235202,"to":1793935835202,"ruleId":"standard-gdr-0-weekday-08:00"}],"subtotal":100000,"fee":0,"vat":10000,"total":110000},"walkIn":true}',1793932235202,0,415649);
INSERT INTO "bookings" ("id","tenant","room","customer","phone","service","people","start","end","status","segments","started","finished","amount","payment","price","created","food_total","golf_amount") VALUES('6a5b402c-7500-4a4c-ad68-685d95859225','golf3d-main','line-1','Khách vãng lai','','gdr',1,1794042058481,1794042458601,'paid','[{"start":1794042058481,"end":1794042158601}]',NULL,1794042158601,7648,'cash','{"config":{"name":"Saigon Golf 3D Club","address":"250 Lương Đình Của, Phường Bình Trưng, TP.HCM","open":"08:00","close":"23:00","vat":10,"fee":0,"capacity":4,"vipCapacity":4,"vipRate":null,"vipHappy":null,"rate":250000,"happy":100000,"hole9":[300000,0,0,900000],"hole18":[400000,0,0,1000000],"vip9":[0,0,0,0],"vip18":[0,0,0,0],"holeMinutes9":[0,0,0,0],"holeMinutes18":[0,0,0,0],"buffer":0,"clean":5,"vipClean":10,"days":2,"grace":15,"cancelHours":2,"published":false,"feeMode":"percent","feeServices":["gdr","9","18"],"bankBin":"","bankAccount":"","bankHolder":"","onlineEnabled":true,"onlineSlug":"saigon-golf","offers":[],"promotions":[],"priceRules":[{"id":"standard-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"standard-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"standard-9-1-weekday-11:00","label":"Giờ thường T2–T6, T7, CN, Lễ","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"standard-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"standard-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"standard-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"vip-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"vip-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"vip-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"vip-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"vip-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"vip-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"vip-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true}],"holidays":[],"pricingRevision":"324ed1d8-6786-47f5-b5d0-f300bccc1b0d"},"base":0,"listBase":0,"promo":null,"vip":false,"version":2,"ruleId":null,"ruleLabel":null,"pricingRevision":"324ed1d8-6786-47f5-b5d0-f300bccc1b0d","estimated":{"lines":[{"date":"2026-11-07","label":"Cuối tuần","minutes":60,"rate":250000,"amount":250000,"from":1794042058481,"to":1794045658481,"ruleId":"standard-gdr-0-weekend-08:00"}],"subtotal":250000,"fee":0,"vat":25000,"total":275000},"walkIn":true}',1794042058481,0,7648);
INSERT INTO "bookings" ("id","tenant","room","customer","phone","service","people","start","end","status","segments","started","finished","amount","payment","price","created","food_total","golf_amount") VALUES('de979280-ceb3-4895-882a-8fec00f970f9','golf3d-main','line-1','Phan Tiến Dũng test','0902030189','gdr',4,1794042857762,1794044668531,'paid','[{"start":1794042857762,"end":1794044368531}]',NULL,1794044368531,115407,'cash','{"config":{"name":"Saigon Golf 3D Club","address":"250 Lương Đình Của, Phường Bình Trưng, TP.HCM","open":"08:00","close":"23:00","vat":10,"fee":0,"capacity":4,"vipCapacity":4,"vipRate":null,"vipHappy":null,"rate":250000,"happy":100000,"hole9":[300000,0,0,900000],"hole18":[400000,0,0,1000000],"vip9":[0,0,0,0],"vip18":[0,0,0,0],"holeMinutes9":[0,0,0,0],"holeMinutes18":[0,0,0,0],"buffer":0,"clean":5,"vipClean":10,"days":2,"grace":15,"cancelHours":2,"published":false,"feeMode":"percent","feeServices":["gdr","9","18"],"bankBin":"","bankAccount":"","bankHolder":"","onlineEnabled":true,"onlineSlug":"saigon-golf","offers":[],"promotions":[],"priceRules":[{"id":"standard-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"standard-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"standard-9-1-weekday-11:00","label":"Giờ thường T2–T6, T7, CN, Lễ","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"standard-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"standard-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"standard-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"vip-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"vip-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"vip-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"vip-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"vip-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"vip-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"vip-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true}],"holidays":[],"pricingRevision":"324ed1d8-6786-47f5-b5d0-f300bccc1b0d"},"base":0,"listBase":0,"promo":null,"vip":false,"version":2,"ruleId":null,"ruleLabel":null,"pricingRevision":"324ed1d8-6786-47f5-b5d0-f300bccc1b0d","estimated":{"lines":[{"date":"2026-11-07","label":"Cuối tuần","minutes":60,"rate":250000,"amount":250000,"from":1794042857762,"to":1794046457762,"ruleId":"standard-gdr-0-weekend-08:00"}],"subtotal":250000,"fee":0,"vat":25000,"total":275000},"walkIn":true}',1794042857762,0,115407);
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "requests" ("id","tenant","booking","kind","status","created") VALUES('8a37b70d-45fd-45f3-af80-e4fe36dffa41','golf3d-main','6a5b402c-7500-4a4c-ad68-685d95859225','Nhân viên hỗ trợ','done',1794042082031);
INSERT INTO "requests" ("id","tenant","booking","kind","status","created") VALUES('55ba3585-d1c1-43b9-b513-b1fb6e856eb0','golf3d-main','6a5b402c-7500-4a4c-ad68-685d95859225','Hỗ trợ thiết bị','done',1794042125211);
INSERT INTO "requests" ("id","tenant","booking","kind","status","created") VALUES('7afa0296-c1fe-4ca0-819a-e3eff08c4021','golf3d-main','6a5b402c-7500-4a4c-ad68-685d95859225','Nhân viên hỗ trợ','done',1794042127403);
INSERT INTO "requests" ("id","tenant","booking","kind","status","created") VALUES('a6907244-fcc9-48fc-8da9-ac84c1ed7ccc','golf3d-main','6a5b402c-7500-4a4c-ad68-685d95859225','Yêu cầu khác','done',1794042128380);
CREATE TABLE `settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
INSERT INTO "settings" ("tenant","value") VALUES('golf3d-main','{"name":"Saigon Golf 3D Club","address":"250 Lương Đình Của, Phường Bình Trưng, TP.HCM","open":"08:00","close":"23:00","vat":10,"fee":0,"feeMode":"percent","feeServices":["gdr","9","18"],"capacity":4,"vipCapacity":4,"rate":250000,"happy":100000,"vipRate":null,"vipHappy":null,"hole9":[300000,0,0,900000],"hole18":[400000,0,0,1000000],"vip9":[0,0,0,0],"vip18":[0,0,0,0],"holeMinutes9":[0,0,0,0],"holeMinutes18":[0,0,0,0],"buffer":0,"clean":5,"vipClean":10,"days":2,"grace":15,"cancelHours":2,"published":false,"bankBin":"","bankAccount":"","bankHolder":"","onlineEnabled":true,"onlineSlug":"saigon-golf","offers":[],"promotions":[],"priceRules":[{"id":"standard-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"standard-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"standard-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"standard-9-1-weekday-11:00","label":"Giờ thường T2–T6, T7, CN, Lễ","service":"9","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"standard-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"standard-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"standard-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"standard-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"standard-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"standard","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"standard-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"standard","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"standard-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"standard-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"standard","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-gdr-0-weekday-08:00","label":"Giờ vàng T2–T6","service":"gdr","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":null,"amount":100000,"enabled":true},{"id":"vip-gdr-0-weekday-11:00","label":"Giờ thường T2–T6","service":"gdr","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-weekend-08:00","label":"Cuối tuần","service":"gdr","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-gdr-0-holiday-08:00","label":"Ngày lễ","service":"gdr","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":null,"amount":250000,"enabled":true},{"id":"vip-9-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":300000,"enabled":true},{"id":"vip-9-1-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-1-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":500000,"enabled":true},{"id":"vip-9-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":600000,"enabled":true},{"id":"vip-9-2-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-2-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1000000,"enabled":true},{"id":"vip-9-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"9","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":900000,"enabled":true},{"id":"vip-9-3-weekday-11:00","label":"Giờ thường T2–T6","service":"9","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-weekend-08:00","label":"Cuối tuần","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-3-holiday-08:00","label":"Ngày lễ","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1500000,"enabled":true},{"id":"vip-9-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-9-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"9","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":900000,"enabled":true},{"id":"vip-18-1-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":1,"amount":400000,"enabled":true},{"id":"vip-18-1-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-1-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":1,"amount":650000,"enabled":true},{"id":"vip-18-2-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":2,"amount":800000,"enabled":true},{"id":"vip-18-2-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-2-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":2,"amount":1300000,"enabled":true},{"id":"vip-18-3-weekday-08:00","label":"Giờ vàng T2–T6","service":"18","room":"vip","day":"weekday","from":"08:00","to":"11:00","people":3,"amount":1200000,"enabled":true},{"id":"vip-18-3-weekday-11:00","label":"Giờ thường T2–T6","service":"18","room":"vip","day":"weekday","from":"11:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-weekend-08:00","label":"Cuối tuần","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-3-holiday-08:00","label":"Ngày lễ","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":3,"amount":1950000,"enabled":true},{"id":"vip-18-4-weekday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-weekend-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"weekend","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true},{"id":"vip-18-4-holiday-08:00","label":"Nhóm 4 người cả ngày","service":"18","room":"vip","day":"holiday","from":"08:00","to":"23:00","people":4,"amount":1000000,"enabled":true}],"holidays":[],"pricingRevision":"324ed1d8-6786-47f5-b5d0-f300bccc1b0d"}');
CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`shift_id` text NOT NULL,
	`kind` text NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`booking_id` text,
	`request_id` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL, `package_id` text, `part` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "finance_entries" ("id","tenant","shift_id","kind","method","amount","booking_id","request_id","note","actor","created","package_id","part") VALUES('bdf195be-c96f-411c-a7e6-7b3ca24ca4e6','golf3d-main','4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','payment','transfer',514903,'2c1dd167-dda7-4599-9311-d74b62e5ec94','cbd9aa90-a677-4d18-ada4-447ffac170ec','Thanh toán phiếu 2c1dd167-dda7-4599-9311-d74b62e5ec94','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793940876501,NULL,0);
INSERT INTO "finance_entries" ("id","tenant","shift_id","kind","method","amount","booking_id","request_id","note","actor","created","package_id","part") VALUES('a6b6c9dd-0dd1-4b86-83d9-5ab783caf961','golf3d-main','4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','payment','cash',415649,'1022457c-7e7c-4ec5-a876-28453eee7a90','32a4675b-31ba-4cec-84df-b5adeae805da','Thanh toán phiếu 1022457c-7e7c-4ec5-a876-28453eee7a90','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793940915198,NULL,0);
INSERT INTO "finance_entries" ("id","tenant","shift_id","kind","method","amount","booking_id","request_id","note","actor","created","package_id","part") VALUES('9f24d491-7963-4e84-b533-203e99386975','golf3d-main','4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','payment','cash',3000000,NULL,'pkg-05f29750-5374-42c3-ba69-3cf58d3d400b','Bán gói Gói tiêu chuẩn 10 giờ (+2 giờ tặng)','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1794041032624,'0c30a546dec7b199e651e00b08b7ef4010a98f9c35cf7775553ae7013d2e2672',0);
INSERT INTO "finance_entries" ("id","tenant","shift_id","kind","method","amount","booking_id","request_id","note","actor","created","package_id","part") VALUES('89d2cd97-7484-4bd7-9f8a-9a83c74e69a1','golf3d-main','4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','payment','cash',7648,'6a5b402c-7500-4a4c-ad68-685d95859225','bb1fcfb0-bb90-44ad-b3c7-43a44810e439','Thanh toán phiếu 6a5b402c-7500-4a4c-ad68-685d95859225','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1794042168540,NULL,0);
INSERT INTO "finance_entries" ("id","tenant","shift_id","kind","method","amount","booking_id","request_id","note","actor","created","package_id","part") VALUES('f5801414-47a1-439a-a0d5-191b772eb6fc','golf3d-main','4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','payment','cash',115407,'de979280-ceb3-4895-882a-8fec00f970f9','aeb0995d-2ec0-4e06-b581-b185fc8bb2b3','Thanh toán phiếu de979280-ceb3-4895-882a-8fec00f970f9','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1794044373913,NULL,0);
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` integer NOT NULL,
	`opening_cash` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`closed_by` text,
	`closed_at` integer,
	`counted_cash` integer,
	`counted_transfer` integer,
	`counted_card` integer,
	`expected_cash` integer,
	`expected_transfer` integer,
	`expected_card` integer,
	`note` text
);
INSERT INTO "shifts" ("id","tenant","name","status","opened_by","opened_at","opening_cash","version","closed_by","closed_at","counted_cash","counted_transfer","counted_card","expected_cash","expected_transfer","expected_card","note") VALUES('4821f350d707cf84f241f887980de8b28563aacbd313fb26ebfba06553e7e893','golf3d-main','Ca làm việc','open','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793927606931,0,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
CREATE TABLE `food_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`request_id` text NOT NULL,
	`request_data` text NOT NULL,
	`items` text NOT NULL,
	`subtotal` integer NOT NULL,
	`fee` integer NOT NULL,
	`vat` integer NOT NULL,
	`total` integer NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`unit` text NOT NULL,
	`price` integer NOT NULL,
	`fee_bps` integer NOT NULL,
	`vat_bps` integer NOT NULL,
	`active` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "menu_items" ("id","tenant","name","category","unit","price","fee_bps","vat_bps","active","version","created") VALUES('2c92ae329d636d37e249aba7e7e2717705b88c96b0df75c99b800866fe571070','golf3d-main','Nước suối Aqua','drink','Chai',15000,0,0,1,0,1794042964909);
INSERT INTO "menu_items" ("id","tenant","name","category","unit","price","fee_bps","vat_bps","active","version","created") VALUES('41645e921ca29bf6361fc8ad7a198d6817bda798862d2ff249b6d68ddfdd2151','golf3d-main','Bánh mỳ','food','Cái',5000,0,0,1,0,1794042989685);
CREATE TABLE `stock_items` (
	`item_id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`low_level` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`unit` text NOT NULL,
	`kind` text NOT NULL,
	`qty` integer NOT NULL,
	`delta` integer NOT NULL,
	`request_id` text NOT NULL,
	`signature` text NOT NULL,
	`order_id` text,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `food_orders`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `memberships` (
	`user_id` text NOT NULL,
	`tenant` text NOT NULL,
	`role` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "memberships" ("user_id","tenant","role","created") VALUES('5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','golf3d-main','owner',1793797811642);
INSERT INTO "memberships" ("user_id","tenant","role","created") VALUES('sale-staff-001-e79eae47','golf3d-main','sale',1794057056825);
INSERT INTO "memberships" ("user_id","tenant","role","created") VALUES('cskh-staff-001-b559429a','golf3d-main','cskh',1794057056825);
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tenant` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "sessions" ("id","user_id","tenant","expires","created") VALUES('yYH8iECp9lZO2PYx4nbMsQCiiT/wFwEuqnVwPBxmzc0=','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','golf3d-main',1795047084723,1793837484723);
INSERT INTO "sessions" ("id","user_id","tenant","expires","created") VALUES('ZxYlm/5rNpU1ip9krQv/zG3mU1FQEOUIdUJyB2cMAgQ=','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','golf3d-main',1795179744914,1793970144914);
INSERT INTO "sessions" ("id","user_id","tenant","expires","created") VALUES('3XfkdwCmjehQi6jrxHYAz+O5liJcCqQR/bWBXdXmp8Q=','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','golf3d-main',1795262936984,1794053336984);
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`must_change` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "users" ("id","email","name","password_hash","must_change","failed_count","locked_until","active","created") VALUES('5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','dungphan72@gmail.com','Chủ cơ sở','pbkdf2$100000$cUK8tWiwL21v13Q/X3A5cA==$huGWgYM2P/d6MDIwWa2dtUaypLduiQKXNIWWOO6oP84=',0,0,0,1,1793797811642);
INSERT INTO "users" ("id","email","name","password_hash","must_change","failed_count","locked_until","active","created") VALUES('sale-staff-001-e79eae47','sale@saigongolf3d.vn','Nguyễn Văn Sale','pbkdf2$100000$4X+osn8SkZ2L86REMK9BnQ==$R0VfkQyX0gbmP3JPlUYiDKTdXKRSQrjAh1JICACohCU=',0,0,0,1,1794057056825);
INSERT INTO "users" ("id","email","name","password_hash","must_change","failed_count","locked_until","active","created") VALUES('cskh-staff-001-b559429a','cskh@saigongolf3d.vn','Trần Thị CSKH','pbkdf2$100000$4X+osn8SkZ2L86REMK9BnQ==$R0VfkQyX0gbmP3JPlUYiDKTdXKRSQrjAh1JICACohCU=',0,0,0,1,1794057056825);
CREATE TABLE `customer_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`type_id` text,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`price_paid` integer NOT NULL,
	`grants` text NOT NULL,
	`perks` text DEFAULT '' NOT NULL,
	`purchased` integer NOT NULL,
	`expires` integer NOT NULL,
	`actor` text NOT NULL, `room` text DEFAULT 'any' NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "customer_packages" ("id","tenant","customer_id","type_id","name","source","price_paid","grants","perks","purchased","expires","actor","room") VALUES('0c30a546dec7b199e651e00b08b7ef4010a98f9c35cf7775553ae7013d2e2672','golf3d-main','5cfae54b-6ebb-4d09-94df-685944091454','7ada9ec4-4292-4d52-b22a-c5b44316016b','Gói tiêu chuẩn 10 giờ (+2 giờ tặng)','sale',3000000,'[{"kind":"gdr","qty":12}]','',1794041032624,2109401032624,'5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','standard');
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
, `birthday` text DEFAULT '' NOT NULL, `email` text DEFAULT '' NOT NULL, `zalo_id` text DEFAULT '' NOT NULL, `marketing_consent` integer DEFAULT 0 NOT NULL, `consent_at` integer);
INSERT INTO "customers" ("id","tenant","name","phone","note","created","birthday","email","zalo_id","marketing_consent","consent_at") VALUES('e629f4b4c75b56435ce737ec8a8cb9a2','golf3d-main','Phan Tiến Dũng','0777773893','Tự tạo từ phiếu thanh toán',1793956158977,'','','',0,NULL);
INSERT INTO "customers" ("id","tenant","name","phone","note","created","birthday","email","zalo_id","marketing_consent","consent_at") VALUES('5cfae54b-6ebb-4d09-94df-685944091454','golf3d-main','Phan Tiến Dũng test','0902030189','',1794024849752,'','','',0,NULL);
CREATE TABLE `loyalty_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `package_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`package_id` text NOT NULL,
	`kind` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`actor` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `customer_packages`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "package_ledger" ("id","tenant","package_id","kind","delta","reason","booking_id","actor","note","created") VALUES('475f76d1-7f86-4e5d-8899-8d7f6df31292','golf3d-main','0c30a546dec7b199e651e00b08b7ef4010a98f9c35cf7775553ae7013d2e2672','gdr',12,'grant',NULL,'5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','',1794041032624);
CREATE TABLE `package_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`package_id` text NOT NULL,
	`kind` text NOT NULL,
	`covered` integer NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL, `units` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `customer_packages`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `package_types` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`grants` text NOT NULL,
	`valid_days` integer NOT NULL,
	`perks` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
, `section` text DEFAULT '' NOT NULL, `room` text DEFAULT 'any' NOT NULL);
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('da3947ce-18de-44fb-a1bd-023d7c71cd7d','golf3d-main','Combo 9 hố · 10 lượt (+1)',3000000,'[{"kind":"holes9","qty":11}]',90,'Giảm 20% F&B khi thanh toán thẻ',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('10f88844-f197-4e5d-9268-1684dc0ca0e3','golf3d-main','Combo 9 hố · 20 lượt (+5)',6000000,'[{"kind":"holes9","qty":25}]',180,'Giảm 20% F&B khi thanh toán thẻ',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('5dac8c74-5196-4292-9b74-4895b8fbefd3','golf3d-main','Combo 18 hố · 10 lượt (+1)',5000000,'[{"kind":"holes18","qty":11}]',90,'Giảm 20% F&B khi thanh toán thẻ',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('69525da6-d13d-4582-a839-60de4db6f54d','golf3d-main','Combo 18 hố · 20 lượt (+5)',10000000,'[{"kind":"holes18","qty":25}]',180,'Giảm 20% F&B khi thanh toán thẻ',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('4ddde69d-4eec-43ba-880c-23fe53a9ae70','golf3d-main','Luyện tập giờ vàng · 10 buổi (+5)',1000000,'[{"kind":"gdr","qty":15}]',60,'90 phút/buổi, giờ vàng 08:00–11:00',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('e29109c2-3a57-4cea-8121-96037d3be30a','golf3d-main','Luyện tập · 10 buổi (+1)',2000000,'[{"kind":"gdr","qty":11}]',90,'90 phút/buổi',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('07c02b7d-3c40-44f9-86e6-27dcd4a5b8fe','golf3d-main','Luyện tập · 20 buổi (+5)',4000000,'[{"kind":"gdr","qty":25}]',180,'90 phút/buổi · miễn phí đỗ xe',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('29d4f6ac-a0aa-4ad6-968f-bad37de4429b','golf3d-main','Luyện tập · 1 tháng',3000000,'[{"kind":"gdr","qty":99999}]',30,'Tặng tủ đồ 1 tháng',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('b5bd5ad3-eece-4db2-9d63-eb3020d1cd18','golf3d-main','Luyện tập · 3 tháng',7500000,'[{"kind":"gdr","qty":99999}]',90,'Tặng tủ đồ 3 tháng',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('ebee5730-8817-4edb-9b3b-997012bce1ca','golf3d-main','Luyện tập · 6 tháng (giảm 30%)',9450000,'[{"kind":"gdr","qty":99999},{"kind":"holes18","qty":6}]',180,'Tặng 6 lượt 18 hố · tủ đồ 6 tháng · miễn phí đỗ xe',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('23a9817f-5564-45fc-95d1-e6eb54e564a2','golf3d-main','Luyện tập · 12 tháng (giảm 30%)',17500000,'[{"kind":"gdr","qty":99999},{"kind":"holes18","qty":12}]',360,'Tặng 12 lượt 18 hố · tủ đồ 12 tháng · miễn phí đỗ xe',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('d8c7d709-89cb-4e0f-aa4f-b76958f9a628','golf3d-main','Thẻ VIP Platinum',20000000,'[{"kind":"holes18","qty":10},{"kind":"gdr","qty":10}]',180,'Phòng chờ VIP · 1 bia/nước · giảm 20% F&B · miễn phí đỗ xe',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('f5213026-cd28-4c55-becc-b79de0eb2ded','golf3d-main','Thẻ VIP Diamond',50000000,'[{"kind":"holes18","qty":20},{"kind":"gdr","qty":20}]',360,'Phòng chờ VVIP · 1 bia/nước · giảm 30% F&B · miễn phí đỗ xe',0,1793838856996,'','any');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('7ada9ec4-4292-4d52-b22a-c5b44316016b','golf3d-main','Gói tiêu chuẩn 10 giờ (+2 giờ tặng)',3000000,'[{"kind":"gdr","qty":12}]',3650,'',1,1793876430841,'Gói giờ (không thời hạn)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('5234a7dc-e4b4-4420-9130-58b748339c8b','golf3d-main','Gói VIP 10 giờ (+2 giờ tặng)',5500000,'[{"kind":"gdr","qty":12}]',3650,'',1,1793876430841,'Gói giờ (không thời hạn)','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('5bb22ad3-5998-48c3-9d39-9412bd85c451','golf3d-main','Gói tiêu chuẩn 20 giờ (+5 giờ tặng)',6000000,'[{"kind":"gdr","qty":25}]',3650,'',1,1793876430841,'Gói giờ (không thời hạn)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('0f45efa7-3ddb-4ca9-84d9-824c601616cc','golf3d-main','Gói VIP 20 giờ (+5 giờ tặng)',11000000,'[{"kind":"gdr","qty":25}]',3650,'',1,1793876430841,'Gói giờ (không thời hạn)','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('933e1b12-4dc6-4f1c-b555-c2a935d6b2bb','golf3d-main','Thẻ tiêu chuẩn 1 giờ/ngày · 1 tháng',3000000,'[{"kind":"gdr","qty":30}]',30,'1 giờ mỗi ngày',1,1793876430841,'Thẻ tháng','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('171c40aa-63cd-4ebd-8ea7-65bde22b171b','golf3d-main','Thẻ VIP 1 giờ/ngày · 1 tháng',5000000,'[{"kind":"gdr","qty":30}]',30,'1 giờ mỗi ngày',1,1793876430841,'Thẻ tháng','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('e40eb517-324a-4a84-87fe-9663ff243e68','golf3d-main','Thẻ tiêu chuẩn 2 giờ/ngày · 1 tháng',5000000,'[{"kind":"gdr","qty":60}]',30,'2 giờ mỗi ngày',1,1793876430841,'Thẻ tháng','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('bfd29d9d-1dcd-4469-bfb0-d1f30930c7bd','golf3d-main','Thẻ VIP 2 giờ/ngày · 1 tháng',8000000,'[{"kind":"gdr","qty":60}]',30,'2 giờ mỗi ngày',1,1793876430841,'Thẻ tháng','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('fe01b6a5-e5b7-41b5-bbfc-e9853a899f5a','golf3d-main','Thẻ tiêu chuẩn 1 giờ/ngày · 6 tháng + 1 tháng tặng',18000000,'[{"kind":"gdr","qty":210}]',210,'1 giờ mỗi ngày',1,1793876430841,'Thẻ 6 tháng (tặng 1 tháng)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('e4bc01d9-724f-416c-a19f-80916bbfe644','golf3d-main','Thẻ VIP 1 giờ/ngày · 6 tháng + 1 tháng tặng',30000000,'[{"kind":"gdr","qty":210}]',210,'1 giờ mỗi ngày',1,1793876430841,'Thẻ 6 tháng (tặng 1 tháng)','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('5f3216b8-db48-4e6d-b585-53de321613d4','golf3d-main','Thẻ tiêu chuẩn 2 giờ/ngày · 6 tháng + 1 tháng tặng',30000000,'[{"kind":"gdr","qty":420}]',210,'2 giờ mỗi ngày',1,1793876430841,'Thẻ 6 tháng (tặng 1 tháng)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('d8db42c1-183b-476b-a79e-3f9ce3f3365a','golf3d-main','Thẻ VIP 2 giờ/ngày · 6 tháng + 1 tháng tặng',48000000,'[{"kind":"gdr","qty":420}]',210,'2 giờ mỗi ngày',1,1793876430841,'Thẻ 6 tháng (tặng 1 tháng)','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('1e64b7cc-2c0e-4efb-a3ec-58abb00af5c0','golf3d-main','Thẻ tiêu chuẩn 1 giờ/ngày · 1 năm + 3 tháng tặng',36000000,'[{"kind":"gdr","qty":450}]',450,'1 giờ mỗi ngày',1,1793876430841,'Thẻ 1 năm (tặng 3 tháng)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('2a7aa1a1-875b-4a28-8b38-e2cbd678904f','golf3d-main','Thẻ VIP 1 giờ/ngày · 1 năm + 3 tháng tặng',60000000,'[{"kind":"gdr","qty":450}]',450,'1 giờ mỗi ngày',1,1793876430841,'Thẻ 1 năm (tặng 3 tháng)','vip');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('d4d43110-776e-4df2-8e21-306a9326a226','golf3d-main','Thẻ tiêu chuẩn 2 giờ/ngày · 1 năm + 3 tháng tặng',60000000,'[{"kind":"gdr","qty":900}]',450,'2 giờ mỗi ngày',1,1793876430841,'Thẻ 1 năm (tặng 3 tháng)','standard');
INSERT INTO "package_types" ("id","tenant","name","price","grants","valid_days","perks","active","created","section","room") VALUES('878f928c-fd1b-4147-ad60-dff8894dce49','golf3d-main','Thẻ VIP 2 giờ/ngày · 1 năm + 3 tháng tặng',96000000,'[{"kind":"gdr","qty":900}]',450,'2 giờ mỗi ngày',1,1793876430841,'Thẻ 1 năm (tặng 3 tháng)','vip');
CREATE TABLE `booking_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code_hash` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`vip` integer DEFAULT 0 NOT NULL,
	`people` integer NOT NULL,
	`start` integer NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`quote` text NOT NULL,
	`status` text NOT NULL,
	`room` text,
	`booking_id` text,
	`reason` text DEFAULT '' NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	`ip_hash` text NOT NULL,
	`created` integer NOT NULL
);
CREATE TABLE `coaches` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`coach_id` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`start` integer NOT NULL,
	`minutes` integer NOT NULL,
	`room` text,
	`status` text NOT NULL,
	`price` integer,
	`note` text DEFAULT '' NOT NULL,
	`coach_note` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`request_id` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `bank_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`external_id` text NOT NULL,
	`amount` integer NOT NULL,
	`content` text NOT NULL,
	`account` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`tx_time` integer NOT NULL,
	`code` text,
	`status` text NOT NULL,
	`booking_id` text,
	`received` integer NOT NULL
);
CREATE TABLE `integrations` (
	`tenant` text NOT NULL,
	`provider` text NOT NULL,
	`key_hash` text NOT NULL,
	`updated` integer NOT NULL
);
INSERT INTO "integrations" ("tenant","provider","key_hash","updated") VALUES('golf3d-main','lead_website','JY7ZHn9pCtlftFa9sSpD22foe5vbNpntdKIYHnXklwk=',1794057089164);
INSERT INTO "integrations" ("tenant","provider","key_hash","updated") VALUES('golf3d-main','lead_ads','RwwBO50VjiXVsisOffUQFdfmMg800vRh+iVLuf9e+wY=',1794057207000);
CREATE TABLE `member_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "member_accounts" ("id","tenant","customer_id","phone","email","password_hash","verified","failed_count","locked_until","created") VALUES('5b4150f6-36a5-4c28-bbb8-bb0561dda8ea','golf3d-main','5cfae54b-6ebb-4d09-94df-685944091454','0902030189','phantiendung3185@gmail.com','pbkdf2$100000$1/c6Djbs8MVNaJNxY+5Wug==$Wa1noAsMH4Fw9ci5XiKgxXjAfu+Ju4/4xWj9jzAWDNE=',0,0,0,1794024849752);
CREATE TABLE `member_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `member_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "member_sessions" ("id","account_id","expires","created") VALUES('jjQfYhH/g4AX22YAf1e6xYzW/eHoam7tUvhUSbUQ1PM=','5b4150f6-36a5-4c28-bbb8-bb0561dda8ea',1796616849784,1794024849784);
CREATE TABLE `package_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`type_id` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`status` text NOT NULL,
	`package_id` text,
	`handled_by` text,
	`handled_at` integer,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `bill_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `member_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`ip_hash` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('ddd95bca-ebf6-4b71-afbd-2f5bb7dec25c','register','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794024849705);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('928a4cf3-2594-44ea-a574-4bee8207aa6a','lead_website','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794057110336);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('84fc5358-062c-4b23-88f1-e69a2cbc36e1','lead_website','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794057128669);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('ecc36fc6-a240-4693-bc3f-d531331bb786','lead_website','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794057146842);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('46531cf2-1843-457a-8098-005ef8e89d37','lead_website','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794057157807);
INSERT INTO "member_attempts" ("id","kind","ip_hash","subject","created") VALUES('de0aa0c6-bed0-4d6a-8605-04179f9478ed','lead_ads','Z2CCMF57vJtms0nYVk4pHclaQRjvnWFO++Z56FjZHbo=','',1794057218088);
CREATE TABLE `crm_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`task_id` text,
	`channel` text NOT NULL,
	`content` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `crm_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`rule` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`due` integer NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`channel` text,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "crm_tasks" ("id","tenant","customer_id","rule","key","title","data","due","status","assignee","channel","note","created","handled_by","handled_at") VALUES('c138f55f1a394b12d5bdde672d833e7f','golf3d-main','e629f4b4c75b56435ce737ec8a8cb9a2','welcome','welcome:e629f4b4c75b56435ce737ec8a8cb9a2','Chào mừng khách mới','{"ten":"Phan Tiến Dũng"}',1793956158977,'open',NULL,NULL,'',1793956158977,NULL,NULL);
INSERT INTO "crm_tasks" ("id","tenant","customer_id","rule","key","title","data","due","status","assignee","channel","note","created","handled_by","handled_at") VALUES('bb28a2ac29c757a08f901572bd867062','golf3d-main','e629f4b4c75b56435ce737ec8a8cb9a2','thanks','thanks:2c1dd167-dda7-4599-9311-d74b62e5ec94','Cảm ơn sau buổi chơi','{"ten":"Phan Tiến Dũng","ngay":"06/11/2026","dich_vu":"gdr"}',1794027260433,'open',NULL,NULL,'',1793956158977,NULL,NULL);
INSERT INTO "crm_tasks" ("id","tenant","customer_id","rule","key","title","data","due","status","assignee","channel","note","created","handled_by","handled_at") VALUES('778d0b42f3fe347abcde1e33ebabb05a','golf3d-main','5cfae54b-6ebb-4d09-94df-685944091454','welcome','welcome:5cfae54b-6ebb-4d09-94df-685944091454','Chào mừng khách mới','{"ten":"Phan Tiến Dũng test"}',1794024849752,'open',NULL,NULL,'',1794026406846,NULL,NULL);
CREATE TABLE `crm_agents` (
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`receives_leads` integer DEFAULT 0 NOT NULL,
	`on_duty` integer DEFAULT 0 NOT NULL,
	`duty_since` integer,
	`last_assigned` integer,
	`zalo_id` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`updated` integer NOT NULL
);
CREATE TABLE `crm_lead_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`source` text NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`ext_key` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`received_at` integer NOT NULL
);
CREATE TABLE `crm_lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`customer_id` text,
	`kind` text NOT NULL,
	`actor` text,
	`detail` text DEFAULT '{}' NOT NULL,
	`created` integer NOT NULL,
	`ukey` text
);
CREATE TABLE `crm_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`zalo_id` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`channel_ref` text DEFAULT '' NOT NULL,
	`need` text DEFAULT '' NOT NULL,
	`guests` integer DEFAULT 0 NOT NULL,
	`preferred_start` integer,
	`message` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`assigned_at` integer,
	`due_at` integer,
	`first_call_at` integer,
	`escalations` integer DEFAULT 0 NOT NULL,
	`tried` text DEFAULT '[]' NOT NULL,
	`received_at` integer NOT NULL,
	`updated` integer NOT NULL,
	`closed_at` integer,
	`lost_reason` text DEFAULT '' NOT NULL
, `stage` text DEFAULT 'new' NOT NULL, `interest` text DEFAULT '' NOT NULL, `budget` integer DEFAULT 0 NOT NULL, `tags` text DEFAULT '[]' NOT NULL, `note` text DEFAULT '' NOT NULL, `deal_value` integer DEFAULT 0 NOT NULL, `next_at` integer, `next_note` text DEFAULT '' NOT NULL, `missed` integer DEFAULT 0 NOT NULL);
CREATE TABLE `crm_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`ukey` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`audience` text DEFAULT 'staff' NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`send_at` integer NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`sent_at` integer
);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('337f8c78-720d-4eca-9952-4c100f39b1be','golf3d-main','crm2:assign:48aac1a3-1589-44ce-8e4f-d15cea9f0923:5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481:1793980280027','email','dungphan72@gmail.com','[CRM] Được giao lead: Phan Tiến Dũng',replace('Khách: Phan Tiến Dũng (0902030185)\nHồ sơ: https://golf3d.nhomdinhduong-ndd.workers.dev/quan-ly?view=crm&lead=48aac1a3-1589-44ce-8e4f-d15cea9f0923','\n',char(10)),'crm2','staff',NULL,NULL,1793980280027,'expired',0,'',1793980280027,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('046c97e6-95dc-4403-a87c-7083ce60459a','golf3d-main','crm2:assign:d258c7c1-1a45-4dec-abc2-7bec08744641:sale-staff-001-e79eae47','email','sale@saigongolf3d.vn','[CRM] Lead mới: Tr?n Minh Qu�n',replace('Khách: Tr?n Minh Qu�n\nĐiện thoại: 0912345678\nNhu cầu: Luyện swing\nGọi trong 5 phút.\nHồ sơ: https://golf3d.nhomdinhduong-ndd.workers.dev/quan-ly?view=crm&lead=d258c7c1-1a45-4dec-abc2-7bec08744641','\n',char(10)),'crm2','staff',NULL,NULL,1794057128704,'expired',0,'',1794057128704,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('6b67bc0f-3f31-4a5f-ba00-229dc7e7145e','golf3d-main','crm2:assign:221be3e5-1dce-4f4c-b577-206939e29e87:cskh-staff-001-b559429a','email','cskh@saigongolf3d.vn','[CRM] Lead mới: L� Ho�ng Y?n',replace('Khách: L� Ho�ng Y?n\nĐiện thoại: 0987654321\nNhu cầu: Game 18 hố\nGọi trong 5 phút.\nHồ sơ: https://golf3d.nhomdinhduong-ndd.workers.dev/quan-ly?view=crm&lead=221be3e5-1dce-4f4c-b577-206939e29e87','\n',char(10)),'crm2','staff',NULL,NULL,1794057146980,'expired',0,'',1794057146980,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('56b231b4-297c-494f-ab3c-9f742fa00b2f','golf3d-main','crm2:again:d258c7c1-1a45-4dec-abc2-7bec08744641:2','email','sale@saigongolf3d.vn','[CRM] Khách gửi lại: Tr?n Minh Qu�n','Khách Tr?n Minh Qu�n (0912345678) vừa gửi lại thông tin. Hồ sơ: https://golf3d.nhomdinhduong-ndd.workers.dev/quan-ly?view=crm&lead=d258c7c1-1a45-4dec-abc2-7bec08744641','crm2','staff',NULL,NULL,1794057157837,'expired',0,'',1794057157837,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('26228df5-c273-415b-86e7-d9dbde103ec1','golf3d-main','crm2:assign:984db512-c5a6-44e5-aa54-08bf7dd8c9b4:sale-staff-001-e79eae47','email','sale@saigongolf3d.vn','[CRM] Lead mới: V� Th�nh D?t',replace('Khách: V� Th�nh D?t\nĐiện thoại: 0933889900\nNhu cầu: Nhóm / sự kiện\nGọi trong 5 phút.\nHồ sơ: https://golf3d.nhomdinhduong-ndd.workers.dev/quan-ly?view=crm&lead=984db512-c5a6-44e5-aa54-08bf7dd8c9b4','\n',char(10)),'crm2','staff',NULL,NULL,1794057218106,'expired',0,'',1794057218106,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('8e036950-17c0-4113-aab2-112115212c97','golf3d-main','crm2:sla:d258c7c1-1a45-4dec-abc2-7bec08744641:sale-staff-001-e79eae47','email','sale@saigongolf3d.vn','[CRM] Cảnh báo quá hạn liên hệ: Tr?n Minh Qu�n',replace('Lead Tr?n Minh Qu�n (0912345678) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=d258c7c1-1a45-4dec-abc2-7bec08744641','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('512e9818-79ef-47dc-a624-bec3b3bb17f2','golf3d-main','crm2:sla:d258c7c1-1a45-4dec-abc2-7bec08744641:5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','email','dungphan72@gmail.com','[CRM] Cảnh báo quá hạn liên hệ: Tr?n Minh Qu�n',replace('Lead Tr?n Minh Qu�n (0912345678) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=d258c7c1-1a45-4dec-abc2-7bec08744641','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('87bdb6f5-1bf6-4642-b8fe-cd836f434e2f','golf3d-main','crm2:sla:221be3e5-1dce-4f4c-b577-206939e29e87:cskh-staff-001-b559429a','email','cskh@saigongolf3d.vn','[CRM] Cảnh báo quá hạn liên hệ: L� Ho�ng Y?n',replace('Lead L� Ho�ng Y?n (0987654321) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=221be3e5-1dce-4f4c-b577-206939e29e87','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('87063680-a6d7-457f-b6b8-68b35fea676c','golf3d-main','crm2:sla:221be3e5-1dce-4f4c-b577-206939e29e87:5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','email','dungphan72@gmail.com','[CRM] Cảnh báo quá hạn liên hệ: L� Ho�ng Y?n',replace('Lead L� Ho�ng Y?n (0987654321) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=221be3e5-1dce-4f4c-b577-206939e29e87','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('a5e3ae77-3de5-4326-8751-2b96f440a3ec','golf3d-main','crm2:sla:984db512-c5a6-44e5-aa54-08bf7dd8c9b4:sale-staff-001-e79eae47','email','sale@saigongolf3d.vn','[CRM] Cảnh báo quá hạn liên hệ: V� Th�nh D?t',replace('Lead V� Th�nh D?t (0933889900) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=984db512-c5a6-44e5-aa54-08bf7dd8c9b4','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('8cc30856-52e2-4c5a-a86c-fc9e89f9adf7','golf3d-main','crm2:sla:984db512-c5a6-44e5-aa54-08bf7dd8c9b4:5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','email','dungphan72@gmail.com','[CRM] Cảnh báo quá hạn liên hệ: V� Th�nh D?t',replace('Lead V� Th�nh D?t (0933889900) quá 5 phút chưa được liên hệ.\nHồ sơ: /quan-ly?view=crm&lead=984db512-c5a6-44e5-aa54-08bf7dd8c9b4','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('f83e4552-e687-4b46-aae2-b9bdc172221b','golf3d-main','crm2:task:87705cbd-ff7d-4d53-9d13-a5400020b97b','email','cskh@saigongolf3d.vn','[CRM] Việc đến hạn: Gọi khách mới',replace('Gọi khách mới\n/quan-ly?view=crm','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('a1f14df9-3be4-48f8-87d1-77cb9c89d4ae','golf3d-main','crm2:task:4291a6b2-e693-4421-bd49-9c18a0497dee','email','sale@saigongolf3d.vn','[CRM] Việc đến hạn: Gọi khách mới',replace('Gọi khách mới\n/quan-ly?view=crm','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('1d7f1f95-62f2-4a4c-9ffb-5dc08feb8423','golf3d-main','crm2:task:a39aa573-8d62-41d2-8e74-2cec0eab767b','email','sale@saigongolf3d.vn','[CRM] Việc đến hạn: Khách gửi lại biểu mẫu, gọi lại ngay',replace('Khách gửi lại biểu mẫu, gọi lại ngay\n/quan-ly?view=crm','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
INSERT INTO "crm_outbox" ("id","tenant","ukey","channel","recipient","subject","body","kind","audience","lead_id","customer_id","send_at","status","attempts","last_error","created","sent_at") VALUES('d93ba858-a1e2-4097-8a89-6c74f434e193','golf3d-main','crm2:task:ea1710ee-2dbd-4d1f-911d-adda69e3d3ed','email','sale@saigongolf3d.vn','[CRM] Việc đến hạn: Gọi khách mới',replace('Gọi khách mới\n/quan-ly?view=crm','\n',char(10)),'crm2','staff',NULL,NULL,1794057612139,'expired',0,'',1794057612139,NULL);
CREATE TABLE `crm2_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('3bde254b-aca9-4539-979d-8effabb0c413','golf3d-main','48aac1a3-1589-44ce-8e4f-d15cea9f0923','SYSTEM','Lead vào kho số','{}','Hệ thống',1793980193954);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('639570e5-8f19-4b4e-9940-3f7b63b38aea','golf3d-main','48aac1a3-1589-44ce-8e4f-d15cea9f0923','CALL','Hẹn đến trải nghiệm','{"result":"APPOINTMENT","nextDue":1794066600000,"first":true}','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793980246566);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('ac822353-077f-4717-9866-faa8c6e68501','golf3d-main','48aac1a3-1589-44ce-8e4f-d15cea9f0923','STAGE','Chuyển giai đoạn: VISIT_SCHEDULED → QUALIFIED','{"from":"VISIT_SCHEDULED","to":"QUALIFIED","dealValue":null}','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793980275873);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('056988b1-98ae-4f24-90bc-5d25aa517659','golf3d-main','48aac1a3-1589-44ce-8e4f-d15cea9f0923','ASSIGN','Giao cho Chủ cơ sở','{"owner":"5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481"}','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793980280027);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('83a00e90-e7d9-4f0b-bb4e-f54eace270d2','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','ASSIGN','Tự động chia cho nhân viên','{"owner":"sale-staff-001-e79eae47"}','Hệ thống',1794057128704);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('26e24eac-09c5-4480-a770-cfaa253f9cd0','golf3d-main','221be3e5-1dce-4f4c-b577-206939e29e87','ASSIGN','Tự động chia cho nhân viên','{"owner":"cskh-staff-001-b559429a"}','Hệ thống',1794057146980);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('f035f518-fe1c-44c9-9478-570dce44c3cb','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','INQUIRY','Khách gửi lại: T�i mu?n d?i sang choi 18 h?','{}','Website',1794057157837);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('4078478a-14a8-44ba-b2e4-0c2d9cd7fce8','golf3d-main','984db512-c5a6-44e5-aa54-08bf7dd8c9b4','ASSIGN','Tự động chia cho nhân viên','{"owner":"sale-staff-001-e79eae47"}','Hệ thống',1794057218106);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('d950a754-a3b7-4c6d-9f79-655bfd73e73c','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794057612139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('5f451dc7-89a6-41e0-b0d2-cf2a5791733b','golf3d-main','221be3e5-1dce-4f4c-b577-206939e29e87','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794057612139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('e5ab9a65-485a-469b-b8ca-3e8f3c2f178a','golf3d-main','984db512-c5a6-44e5-aa54-08bf7dd8c9b4','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794057612139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('d33d1b43-514d-456c-bd7f-f34b4ee3a5a8','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','ASSIGN','Thu hồi về kho số: quá 48 giờ chưa liên hệ','{"from":"sale-staff-001-e79eae47"}','Hệ thống',1794230112139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('168aca61-5039-4b06-8c89-5dbbd4911833','golf3d-main','221be3e5-1dce-4f4c-b577-206939e29e87','ASSIGN','Thu hồi về kho số: quá 48 giờ chưa liên hệ','{"from":"cskh-staff-001-b559429a"}','Hệ thống',1794230112139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('6162ba51-2531-4b6d-b389-d7bedb01bc57','golf3d-main','984db512-c5a6-44e5-aa54-08bf7dd8c9b4','ASSIGN','Thu hồi về kho số: quá 48 giờ chưa liên hệ','{"from":"sale-staff-001-e79eae47"}','Hệ thống',1794230112139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('167647eb-a7f5-4987-b398-5e9806240c95','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794230412139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('792ed3a0-b223-42fa-bc8d-1b0c701b28bd','golf3d-main','221be3e5-1dce-4f4c-b577-206939e29e87','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794230412139);
INSERT INTO "crm2_activities" ("id","tenant","lead_id","type","content","meta","actor","created") VALUES('711ae1ea-89c2-43bc-8ad8-d7f45723810d','golf3d-main','984db512-c5a6-44e5-aa54-08bf7dd8c9b4','SYSTEM','Quá 5 phút chưa liên hệ (nhắc nhân viên & báo quản lý)','{}','Hệ thống',1794230412139);
CREATE TABLE `crm2_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`owner` text,
	`service` text DEFAULT '' NOT NULL,
	`at` integer NOT NULL,
	`status` text DEFAULT 'CONFIRMED' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`approved_by` text,
	`decided_at` integer,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
CREATE TABLE `crm2_blocked_phones` (
	`tenant` text NOT NULL,
	`phone_norm` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`added_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
CREATE TABLE `crm2_customer_profiles` (
	`tenant` text NOT NULL,
	`phone_norm` text NOT NULL,
	`code` text NOT NULL,
	`birthday` text DEFAULT '' NOT NULL,
	`gender` text DEFAULT '' NOT NULL,
	`occupation` text DEFAULT '' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`birthday_task_year` integer,
	`updated_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
CREATE TABLE `crm2_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text DEFAULT '' NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`lead_id` text NOT NULL,
	`lead_name` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'HOLD' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`expires_at` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
CREATE TABLE `crm2_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_norm` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`target_service` text DEFAULT '' NOT NULL,
	`preferred_date` text DEFAULT '' NOT NULL,
	`preferred_time` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'NEW' NOT NULL,
	`status_id` text DEFAULT 'khach-moi' NOT NULL,
	`owner` text,
	`owned_at` integer,
	`claimed_by` text,
	`claimed_at` integer,
	`pooled_at` integer,
	`lost_reason` text DEFAULT '' NOT NULL,
	`expected_value` integer DEFAULT 0 NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`last_contact_at` integer,
	`inquiry_count` integer DEFAULT 1 NOT NULL,
	`next_action` text DEFAULT 'NEW' NOT NULL,
	`next_due` integer,
	`call_attempts` integer DEFAULT 0 NOT NULL,
	`last_result` text DEFAULT '' NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`sla_alerted_at` integer,
	`stale_task_at` integer,
	`first_response_at` integer,
	`first_response_by` text,
	`first_response_min` integer,
	`first_response_work_min` integer,
	`won_at` integer,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
, `channel_ref` text DEFAULT '' NOT NULL);
INSERT INTO "crm2_leads" ("id","tenant","full_name","phone","phone_norm","email","notes","source","target_service","preferred_date","preferred_time","stage","status_id","owner","owned_at","claimed_by","claimed_at","pooled_at","lost_reason","expected_value","budget","last_contact_at","inquiry_count","next_action","next_due","call_attempts","last_result","labels","sla_alerted_at","stale_task_at","first_response_at","first_response_by","first_response_min","first_response_work_min","won_at","created","updated","channel_ref") VALUES('48aac1a3-1589-44ce-8e4f-d15cea9f0923','golf3d-main','Phan Tiến Dũng','0902030185','0902030185','','','Nhập tay','Chơi 18 hố','','','QUALIFIED','goi-lai-1','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1793980280027,NULL,NULL,1793980193954,'',0,0,1793980246566,1,'MEETING',1794066600000,0,'APPOINTMENT','[]',NULL,NULL,1793980246566,'5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481',1,1,NULL,1793980193954,1793980280027,'');
INSERT INTO "crm2_leads" ("id","tenant","full_name","phone","phone_norm","email","notes","source","target_service","preferred_date","preferred_time","stage","status_id","owner","owned_at","claimed_by","claimed_at","pooled_at","lost_reason","expected_value","budget","last_contact_at","inquiry_count","next_action","next_due","call_attempts","last_result","labels","sla_alerted_at","stale_task_at","first_response_at","first_response_by","first_response_min","first_response_work_min","won_at","created","updated","channel_ref") VALUES('d258c7c1-1a45-4dec-abc2-7bec08744641','golf3d-main','Tr?n Minh Qu�n','0912345678','0912345678','quan.tran@example.com',replace('Mu?n th? ph�ng VIP chi?u mai l�c 14h\nChiến dịch: Web_Booking','\n',char(10)),'Website','Luyện swing','','','NEW','khach-moi',NULL,NULL,NULL,NULL,1794230112139,'',0,0,NULL,2,'NEW',1794230412139,0,'','[]',1794230412139,NULL,NULL,NULL,NULL,NULL,NULL,1794057128704,1794230112139,'');
INSERT INTO "crm2_leads" ("id","tenant","full_name","phone","phone_norm","email","notes","source","target_service","preferred_date","preferred_time","stage","status_id","owner","owned_at","claimed_by","claimed_at","pooled_at","lost_reason","expected_value","budget","last_contact_at","inquiry_count","next_action","next_due","call_attempts","last_result","labels","sla_alerted_at","stale_task_at","first_response_at","first_response_by","first_response_min","first_response_work_min","won_at","created","updated","channel_ref") VALUES('221be3e5-1dce-4f4c-b577-206939e29e87','golf3d-main','L� Ho�ng Y?n','0987654321','0987654321','yen.le@example.com',replace('D?t s�n 18 h? cu?i tu?n\nChiến dịch: Fb_Golfers','\n',char(10)),'Website','Game 18 hố','','','NEW','khach-moi',NULL,NULL,NULL,NULL,1794230112139,'',0,0,NULL,1,'NEW',1794230412139,0,'','[]',1794230412139,NULL,NULL,NULL,NULL,NULL,NULL,1794057146980,1794230112139,'');
INSERT INTO "crm2_leads" ("id","tenant","full_name","phone","phone_norm","email","notes","source","target_service","preferred_date","preferred_time","stage","status_id","owner","owned_at","claimed_by","claimed_at","pooled_at","lost_reason","expected_value","budget","last_contact_at","inquiry_count","next_action","next_due","call_attempts","last_result","labels","sla_alerted_at","stale_task_at","first_response_at","first_response_by","first_response_min","first_response_work_min","won_at","created","updated","channel_ref") VALUES('984db512-c5a6-44e5-aa54-08bf7dd8c9b4','golf3d-main','V� Th�nh D?t','0933889900','0933889900','dat.vo@example.com',replace('T? ch?c gi?i mini cho c�ng ty 20 ngu?i\nChiến dịch: Google_Search_Golf','\n',char(10)),'Quảng cáo','Nhóm / sự kiện','','','NEW','khach-moi',NULL,NULL,NULL,NULL,1794230112139,'',0,0,NULL,1,'NEW',1794230412139,0,'','[]',1794230412139,NULL,NULL,NULL,NULL,NULL,NULL,1794057218106,1794230112139,'');
CREATE TABLE `crm2_order_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`order_id` text NOT NULL,
	`kind` text DEFAULT 'INSTALLMENT' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`due_date` text,
	`paid_at` integer,
	`method` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reminded_at` integer,
	`created_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
CREATE TABLE `crm2_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`lead_id` text NOT NULL,
	`hold_id` text,
	`product_code` text DEFAULT '' NOT NULL,
	`product_name` text DEFAULT '' NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`list_price` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`cancelled_at` integer,
	`cancel_reason` text DEFAULT '' NOT NULL,
	`refund_due` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
CREATE TABLE `crm2_products` (
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`list_price` integer DEFAULT 0 NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
CREATE TABLE `crm2_runtime` (
	`tenant` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
INSERT INTO "crm2_runtime" ("tenant","key","value","updated") VALUES('golf3d-main','cron','{"holdsExpired":0,"recalled":0,"slaAlerts":0,"taskReminders":0,"staleTasks":0,"birthdays":0,"careTasks":0,"paymentReminders":0,"errors":[],"at":1794464412139}',1794464412139);
CREATE TABLE `crm2_settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
INSERT INTO "crm2_settings" ("tenant","value","updated") VALUES('golf3d-main','{"autoAssign":true,"slaMinutes":5,"holdHours":48,"pool":{"claimQuotaPerDay":20,"recallHours":48,"autoRecall":true,"intakeMode":"AUTO"},"labels":[{"id":"vip","name":"VIP","color":"#b45309"},{"id":"doanh-nghiep","name":"Doanh nghiệp","color":"#1d4ed8"},{"id":"nguoi-moi","name":"Người mới chơi","color":"#047857"},{"id":"can-hlv","name":"Cần HLV","color":"#7c3aed"},{"id":"nhay-cam-gia","name":"Nhạy cảm về giá","color":"#be123c"}],"calls":{"retryHours":[2,24,48],"thinkDays":2,"interestedHours":24,"metFollowUpHours":24},"distribution":{"mode":"FAIR","weights":{},"paused":[],"returnToPrevious":true,"bySource":{}},"appointments":{"requireApproval":false},"workHours":{"enabled":1,"days":[0,1,2,3,4,5,6],"start":480,"end":1320},"tiers":[{"id":"member","name":"Thành viên","min":0,"color":"#6b7280"},{"id":"silver","name":"Bạc","min":10000000,"color":"#64748b"},{"id":"gold","name":"Vàng","min":30000000,"color":"#b45309"},{"id":"diamond","name":"Kim cương","min":100000000,"color":"#0891b2"}],"afterSales":{"enabled":false,"steps":[{"days":3,"title":"Gọi hỏi thăm sau khi mua, xác nhận khách đã nhận quyền lợi"},{"days":30,"title":"Nhắc tiến độ sử dụng dịch vụ và thanh toán"},{"days":90,"title":"Xin phản hồi và đề nghị giới thiệu khách mới"}],"assignTo":""},"statuses":{"groups":[{"id":"moi","name":"1. Khách mới","color":"#3b82f6"},{"id":"tu-van","name":"2. Đang tư vấn","color":"#06b6d4"},{"id":"tiem-nang","name":"3. Tiềm năng","color":"#f59e0b"},{"id":"da-trai-nghiem","name":"4. Đã trải nghiệm","color":"#8b5cf6"},{"id":"da-mua","name":"5. Đã mua dịch vụ","color":"#16a34a"},{"id":"khong-tiem-nang","name":"6. Không tiềm năng","color":"#6b7280"}],"statuses":[{"id":"khach-moi","name":"Khách mới","stage":"NEW","group":"moi","system":true},{"id":"chua-lien-lac-1","name":"Chưa liên lạc được lần 1","stage":"NEW","group":"moi","system":true},{"id":"chua-lien-lac-2","name":"Chưa liên lạc được lần 2","stage":"NEW","group":"moi","system":true},{"id":"chua-lien-lac-3","name":"Chưa liên lạc được lần 3","stage":"NEW","group":"moi","system":true},{"id":"da-lien-he","name":"Đã liên hệ","stage":"CONTACTED","group":"tu-van","system":true},{"id":"goi-lai-1","name":"Gọi lại tư vấn tiếp lần 1","stage":"QUALIFIED","group":"tu-van","system":true},{"id":"goi-lai-2","name":"Gọi lại tư vấn tiếp lần 2","stage":"QUALIFIED","group":"tu-van","system":true},{"id":"goi-lai-3","name":"Gọi lại tư vấn tiếp lần 3","stage":"QUALIFIED","group":"tu-van","system":true},{"id":"hen-trai-nghiem","name":"KH hẹn đến trải nghiệm","stage":"VISIT_SCHEDULED","group":"tiem-nang","system":true},{"id":"da-trai-nghiem","name":"Đã đến trải nghiệm","stage":"VISITED","group":"da-trai-nghiem","system":true},{"id":"dat-coc","name":"KH đã đặt cọc","stage":"DEPOSITED","group":"da-mua","system":true},{"id":"da-mua","name":"KH đã mua dịch vụ","stage":"WON","group":"da-mua","system":true},{"id":"khong-lien-lac-duoc","name":"KH không liên lạc được","stage":"LOST","group":"khong-tiem-nang","system":true},{"id":"khong-mua","name":"KH không mua","stage":"LOST","group":"khong-tiem-nang","system":true},{"id":"khong-den-trai-nghiem","name":"KH không đến trải nghiệm","stage":"LOST","group":"khong-tiem-nang","system":true},{"id":"bo-qua","name":"Bỏ qua","stage":"LOST","group":"khong-tiem-nang","system":true},{"id":"chua-lien-lac-duoc-lan-1","name":"Chưa liên lạc được lần 1","stage":"NEW","group":"moi","system":false},{"id":"chua-lien-lac-duoc-lan-2","name":"Chưa liên lạc được lần 2","stage":"NEW","group":"moi","system":false},{"id":"chua-lien-lac-duoc-lan-3","name":"Chưa liên lạc được lần 3","stage":"NEW","group":"moi","system":false},{"id":"goi-lai-tu-van-tiep-lan-1","name":"Gọi lại tư vấn tiếp lần 1","stage":"QUALIFIED","group":"tu-van","system":false},{"id":"goi-lai-tu-van-tiep-lan-2","name":"Gọi lại tư vấn tiếp lần 2","stage":"QUALIFIED","group":"tu-van","system":false},{"id":"goi-lai-tu-van-tiep-lan-3","name":"Gọi lại tư vấn tiếp lần 3","stage":"QUALIFIED","group":"tu-van","system":false},{"id":"kh-hen-den-trai-nghiem","name":"KH hẹn đến trải nghiệm","stage":"VISIT_SCHEDULED","group":"tiem-nang","system":false},{"id":"da-den-trai-nghiem","name":"Đã đến trải nghiệm","stage":"VISITED","group":"da-trai-nghiem","system":false},{"id":"kh-da-dat-coc","name":"KH đã đặt cọc","stage":"DEPOSITED","group":"da-mua","system":false},{"id":"kh-da-mua-dich-vu","name":"KH đã mua dịch vụ","stage":"WON","group":"da-mua","system":false},{"id":"kh-khong-lien-lac-duoc","name":"KH không liên lạc được","stage":"LOST","group":"khong-tiem-nang","system":false},{"id":"kh-khong-mua","name":"KH không mua","stage":"LOST","group":"khong-tiem-nang","system":false},{"id":"kh-khong-den-trai-nghiem","name":"KH không đến trải nghiệm","stage":"LOST","group":"khong-tiem-nang","system":false}]},"notifyAssignEmail":true,"care":{"rules":{"welcome":{"enabled":true,"value":0},"thanks":{"enabled":true,"value":24},"comeback":{"enabled":true,"value":30},"pkg_expiring":{"enabled":true,"value":7},"pkg_low":{"enabled":true,"value":2},"birthday":{"enabled":true,"value":2},"points":{"enabled":true,"value":0}},"templates":{"welcome":"Chào {ten}, cảm ơn anh/chị đã đến với {cs}. Anh/chị cần đặt lịch hay tư vấn gói hội viên, cứ nhắn em nhé!","thanks":"Chào {ten}, cảm ơn anh/chị đã chơi tại {cs} hôm {ngay}. Anh/chị thấy trải nghiệm thế nào ạ? Rất mong được phục vụ anh/chị lần sau.","comeback":"Chào {ten}, lâu rồi ({so_ngay} ngày) em chưa thấy anh/chị ghé {cs}. Đang có nhiều ưu đãi, anh/chị đặt lịch tuần này em hỗ trợ nhé!","pkg_expiring":"Chào {ten}, {goi} của anh/chị còn {con} và hết hạn ngày {han}. Anh/chị sắp xếp lịch chơi hoặc gia hạn để không mất giờ nhé ạ.","pkg_low":"Chào {ten}, {goi} của anh/chị chỉ còn {con}. Em gửi anh/chị ưu đãi khi gia hạn gói mới nếu anh/chị cần ạ.","birthday":"Chúc mừng sinh nhật {ten}! {cs} xin gửi lời chúc sức khỏe và những cú đánh thật đẹp. Mời anh/chị ghé chơi nhận quà sinh nhật.","points":"Chào {ten}, anh/chị đã có {diem} điểm, đủ đổi một lượt chơi miễn phí tại {cs}. Anh/chị ghé đổi lượt giúp em nhé!"},"vipSpend":10000000},"websiteLeads":"CRM2","zaloLeads":"CRM2","facebookLeads":"CRM2","adsLeads":"CRM2"}',1794056676309);
CREATE TABLE `crm2_staff` (
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`is_leader` integer DEFAULT 0 NOT NULL,
	`extension` text DEFAULT '' NOT NULL,
	`updated` integer NOT NULL
, `zalo_id` text DEFAULT '' NOT NULL, `notify_email` text DEFAULT '' NOT NULL);
INSERT INTO "crm2_staff" ("tenant","user_id","team","is_leader","extension","updated","zalo_id","notify_email") VALUES('golf3d-main','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','Quản lý',1,'101',1794057056825,'','dungphan72@gmail.com');
INSERT INTO "crm2_staff" ("tenant","user_id","team","is_leader","extension","updated","zalo_id","notify_email") VALUES('golf3d-main','sale-staff-001-e79eae47','Kinh doanh',0,'102',1794057056825,'','sale@saigongolf3d.vn');
INSERT INTO "crm2_staff" ("tenant","user_id","team","is_leader","extension","updated","zalo_id","notify_email") VALUES('golf3d-main','cskh-staff-001-b559429a','Chăm sóc',0,'103',1794057056825,'','cskh@saigongolf3d.vn');
CREATE TABLE `crm2_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text,
	`title` text NOT NULL,
	`type` text DEFAULT 'FOLLOW_UP' NOT NULL,
	`due_at` integer,
	`done_at` integer,
	`assignee` text,
	`created_by` text DEFAULT '' NOT NULL,
	`reminded_at` integer,
	`ukey` text,
	`created` integer NOT NULL
, `customer_id` text, `rule` text DEFAULT '' NOT NULL, `data` text DEFAULT '{}' NOT NULL, `channel` text DEFAULT '' NOT NULL, `note` text DEFAULT '' NOT NULL, `outcome` text DEFAULT '' NOT NULL);
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('1af10bd3-cd10-45f9-a992-6f88bd4df2aa','golf3d-main','48aac1a3-1589-44ce-8e4f-d15cea9f0923','KH hẹn đến trải nghiệm','VISIT',1794066600000,1793980519714,'5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','Hệ thống',NULL,NULL,1793980246566,NULL,'','{}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('8466fa6135430e94779593b3ca6fc3b9','golf3d-main',NULL,'Chào mừng khách mới','CALL',1793956158977,NULL,NULL,'Hệ thống',NULL,'welcome:e629f4b4c75b56435ce737ec8a8cb9a2',1794029712139,'e629f4b4c75b56435ce737ec8a8cb9a2','welcome','{"ten":"Phan Tiến Dũng"}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('b10bf4c58dafbcfdcc55b838ce3aa08b','golf3d-main',NULL,'Chào mừng khách mới','CALL',1794024849752,NULL,NULL,'Hệ thống',NULL,'welcome:5cfae54b-6ebb-4d09-94df-685944091454',1794029712139,'5cfae54b-6ebb-4d09-94df-685944091454','welcome','{"ten":"Phan Tiến Dũng test"}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('efd161a926b6b748510d2f71e7a3f678','golf3d-main',NULL,'Cảm ơn sau buổi chơi','CALL',1794027260433,NULL,NULL,'Hệ thống',NULL,'thanks:2c1dd167-dda7-4599-9311-d74b62e5ec94',1794029712139,'e629f4b4c75b56435ce737ec8a8cb9a2','thanks','{"ten":"Phan Tiến Dũng","ngay":"06/11/2026","dich_vu":"gdr"}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('a8d15fcf52a1ec087b1e3a0ed082b765','golf3d-main',NULL,'Cảm ơn sau buổi chơi','CALL',1794130768531,NULL,NULL,'Hệ thống',NULL,'thanks:de979280-ceb3-4895-882a-8fec00f970f9',1794044412139,'5cfae54b-6ebb-4d09-94df-685944091454','thanks','{"ten":"Phan Tiến Dũng test","ngay":"07/11/2026","dich_vu":"gdr"}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('4291a6b2-e693-4421-bd49-9c18a0497dee','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','Gọi khách mới','CALL',1794057428704,1794230112139,'sale-staff-001-e79eae47','Hệ thống',1794057612139,'new:d258c7c1-1a45-4dec-abc2-7bec08744641',1794057128704,NULL,'','{}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('87705cbd-ff7d-4d53-9d13-a5400020b97b','golf3d-main','221be3e5-1dce-4f4c-b577-206939e29e87','Gọi khách mới','CALL',1794057446980,1794230112139,'cskh-staff-001-b559429a','Hệ thống',1794057612139,'new:221be3e5-1dce-4f4c-b577-206939e29e87',1794057146980,NULL,'','{}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('a39aa573-8d62-41d2-8e74-2cec0eab767b','golf3d-main','d258c7c1-1a45-4dec-abc2-7bec08744641','Khách gửi lại biểu mẫu, gọi lại ngay','CALL',1794057457837,1794230112139,'sale-staff-001-e79eae47','Hệ thống',1794057612139,'again:d258c7c1-1a45-4dec-abc2-7bec08744641:2',1794057157837,NULL,'','{}','','','');
INSERT INTO "crm2_tasks" ("id","tenant","lead_id","title","type","due_at","done_at","assignee","created_by","reminded_at","ukey","created","customer_id","rule","data","channel","note","outcome") VALUES('ea1710ee-2dbd-4d1f-911d-adda69e3d3ed','golf3d-main','984db512-c5a6-44e5-aa54-08bf7dd8c9b4','Gọi khách mới','CALL',1794057518106,1794230112139,'sale-staff-001-e79eae47','Hệ thống',1794057612139,'new:984db512-c5a6-44e5-aa54-08bf7dd8c9b4',1794057218106,NULL,'','{}','','','');
CREATE TABLE `crm2_inbound` (
	`tenant` text NOT NULL,
	`ext_key` text NOT NULL,
	`lead_id` text NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "crm2_inbound" ("tenant","ext_key","lead_id","created") VALUES('golf3d-main','ads:ads:0933889900:29900953','984db512-c5a6-44e5-aa54-08bf7dd8c9b4',1794057218106);
CREATE TABLE `push_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_jwk` text NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "push_keys" ("id","public_key","private_jwk","created") VALUES('vapid','BP7Q2HwAXCek5kJu-GA64SWYOcGD9BBm28dcsJ_sFIhLNrTCG6h8FQgxTWVt1MwhrfwIzQcrqjJpy8HjQBTlrG0','{"kty":"EC","key_ops":["sign"],"ext":true,"crv":"P-256","x":"_tDYfABcJ6TmQm74YDrhJZg5wYP0EGbbx1ywn-wUiEs","y":"NrTCG6h8FQgxTWVt1MwhrfwIzQcrqjJpy8HjQBTlrG0","d":"-tWoc-VdP4GizqAn5KCv2ov9NtW9g7QcO7k-S2aOxlk"}',1794022831732);
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created` integer NOT NULL
);
INSERT INTO "push_subscriptions" ("endpoint","tenant","user_id","p256dh","auth","created") VALUES('https://fcm.googleapis.com/fcm/send/eqpHiPvd09I:APA91bF62KDbSrnLKil5FlHQXkxJCVFrsSG6jF518Uh1NGEQtIj4yl6rEhz6CkkFYOrm0c9sfgNv2McV043VyMpn4zKUAFQYq6EowOoImNe2tQrCO4Zndb_RIJG3hTMM7R-QGoi_jR0-','golf3d-main','5d5ecd6e-3ebf-4d6a-aa25-95855a2a3481','BGkrDxNOe0pFTFdHxQGKCMDa5mIcUDvJhtUFPR_yTimgDQLFxHElD8540qFlnY9vrfPh_onlumIbDcZ8bL1fofg','zg9X_GYou7E9QpqWsv3ppA',1794022834263);
CREATE TABLE `crm2_customer_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`task_id` text,
	`channel` text NOT NULL,
	`content` text NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',24);
CREATE INDEX `booking_room_time` ON `bookings` (`tenant`,`room`,`start`,`end`);
CREATE UNIQUE INDEX `finance_request_once` ON `finance_entries` (`tenant`,`request_id`);
CREATE INDEX `finance_shift_time` ON `finance_entries` (`tenant`,`shift_id`,`created`);
CREATE UNIQUE INDEX `one_open_shift_per_tenant` ON `shifts` (`tenant`) WHERE "shifts"."status" = 'open';
CREATE INDEX `shift_tenant_time` ON `shifts` (`tenant`,`opened_at`);
CREATE UNIQUE INDEX `food_order_request_once` ON `food_orders` (`tenant`,`request_id`);
CREATE INDEX `food_order_booking` ON `food_orders` (`tenant`,`booking_id`);
CREATE INDEX `food_order_status` ON `food_orders` (`tenant`,`status`);
CREATE INDEX `menu_tenant` ON `menu_items` (`tenant`,`active`);
CREATE UNIQUE INDEX `stock_request_once` ON `stock_movements` (`tenant`,`request_id`);
CREATE INDEX `stock_item_time` ON `stock_movements` (`tenant`,`item_id`,`created`);
CREATE UNIQUE INDEX `membership_user_tenant` ON `memberships` (`user_id`,`tenant`);
CREATE INDEX `membership_tenant` ON `memberships` (`tenant`);
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);
CREATE INDEX `customer_package_customer` ON `customer_packages` (`tenant`,`customer_id`);
CREATE UNIQUE INDEX `customer_phone` ON `customers` (`tenant`,`phone`);
CREATE INDEX `loyalty_customer` ON `loyalty_ledger` (`tenant`,`customer_id`);
CREATE UNIQUE INDEX `loyalty_earn_once` ON `loyalty_ledger` (`tenant`,`booking_id`) WHERE "loyalty_ledger"."reason" = 'earn';
CREATE INDEX `package_ledger_package` ON `package_ledger` (`tenant`,`package_id`);
CREATE UNIQUE INDEX `redemption_once` ON `package_redemptions` (`tenant`,`booking_id`);
CREATE INDEX `package_type_tenant` ON `package_types` (`tenant`);
CREATE UNIQUE INDEX `package_paid_once` ON `finance_entries` (`tenant`,`package_id`) WHERE "finance_entries"."package_id" IS NOT NULL;
CREATE UNIQUE INDEX `booking_request_code` ON `booking_requests` (`code_hash`);
CREATE INDEX `booking_request_tenant` ON `booking_requests` (`tenant`,`status`,`created`);
CREATE INDEX `booking_request_ip` ON `booking_requests` (`ip_hash`,`created`);
CREATE INDEX `coach_tenant` ON `coaches` (`tenant`);
CREATE INDEX `lesson_coach_time` ON `lessons` (`tenant`,`coach_id`,`start`);
CREATE UNIQUE INDEX `lesson_request_once` ON `lessons` (`tenant`,`request_id`);
CREATE UNIQUE INDEX `bank_tx_external` ON `bank_transactions` (`tenant`,`external_id`);
CREATE INDEX `bank_tx_code` ON `bank_transactions` (`tenant`,`code`);
CREATE UNIQUE INDEX `bank_tx_booking_once` ON `bank_transactions` (`tenant`,`booking_id`) WHERE "bank_transactions"."booking_id" IS NOT NULL;
CREATE UNIQUE INDEX `integration_tenant_provider` ON `integrations` (`tenant`,`provider`);
CREATE UNIQUE INDEX `integration_key` ON `integrations` (`provider`,`key_hash`);
CREATE UNIQUE INDEX `booking_part_method_once` ON `finance_entries` (`tenant`,`booking_id`,`method`) WHERE "finance_entries"."booking_id" IS NOT NULL AND "finance_entries"."part" = 1;
CREATE UNIQUE INDEX `booking_paid_once` ON `finance_entries` (`tenant`,`booking_id`) WHERE "finance_entries"."booking_id" IS NOT NULL AND "finance_entries"."part" = 0;
CREATE UNIQUE INDEX `member_account_phone` ON `member_accounts` (`tenant`,`phone`);
CREATE INDEX `member_account_customer` ON `member_accounts` (`customer_id`);
CREATE INDEX `member_session_account` ON `member_sessions` (`account_id`);
CREATE INDEX `package_order_customer` ON `package_orders` (`tenant`,`customer_id`,`status`);
CREATE UNIQUE INDEX `bill_discount_once` ON `bill_discounts` (`tenant`,`booking_id`);
CREATE INDEX `member_attempt_ip` ON `member_attempts` (`kind`,`ip_hash`,`created`);
CREATE INDEX `member_attempt_subject` ON `member_attempts` (`kind`,`subject`,`created`);
CREATE INDEX `crm_interaction_customer` ON `crm_interactions` (`tenant`,`customer_id`,`created`);
CREATE UNIQUE INDEX `crm_task_key` ON `crm_tasks` (`tenant`,`key`);
CREATE INDEX `crm_task_status` ON `crm_tasks` (`tenant`,`status`,`due`);
CREATE INDEX `crm_task_customer` ON `crm_tasks` (`tenant`,`customer_id`);
CREATE UNIQUE INDEX `crm_agent_user` ON `crm_agents` (`tenant`,`user_id`);
CREATE UNIQUE INDEX `crm_contact_key` ON `crm_lead_contacts` (`tenant`,`ext_key`);
CREATE INDEX `crm_contact_lead` ON `crm_lead_contacts` (`lead_id`);
CREATE UNIQUE INDEX `crm_event_key` ON `crm_lead_events` (`tenant`,`ukey`);
CREATE INDEX `crm_event_lead` ON `crm_lead_events` (`lead_id`,`created`);
CREATE INDEX `crm_event_customer` ON `crm_lead_events` (`tenant`,`customer_id`,`created`);
CREATE INDEX `crm_lead_status` ON `crm_leads` (`tenant`,`status`,`due_at`);
CREATE INDEX `crm_lead_phone` ON `crm_leads` (`tenant`,`phone`);
CREATE UNIQUE INDEX `crm_outbox_key` ON `crm_outbox` (`tenant`,`ukey`);
CREATE INDEX `crm_outbox_status` ON `crm_outbox` (`status`,`send_at`);
CREATE UNIQUE INDEX `crm_lead_open_phone` ON `crm_leads` (`tenant`,`phone`) WHERE `phone` <> '' AND `status` IN ('queued','assigned');
CREATE INDEX `crm2_activity_lead` ON `crm2_activities` (`tenant`,`lead_id`,`created`);
CREATE INDEX `crm2_appt_at` ON `crm2_appointments` (`tenant`,`at`);
CREATE INDEX `crm2_appt_lead` ON `crm2_appointments` (`tenant`,`lead_id`);
CREATE UNIQUE INDEX `crm2_blocked_key` ON `crm2_blocked_phones` (`tenant`,`phone_norm`);
CREATE UNIQUE INDEX `crm2_profile_phone` ON `crm2_customer_profiles` (`tenant`,`phone_norm`);
CREATE UNIQUE INDEX `crm2_profile_code` ON `crm2_customer_profiles` (`tenant`,`code`);
CREATE INDEX `crm2_hold_lead` ON `crm2_holds` (`tenant`,`lead_id`);
CREATE UNIQUE INDEX `crm2_hold_active` ON `crm2_holds` (`tenant`,`product_code`) WHERE status = 'ACTIVE' AND limited = 1;
CREATE INDEX `crm2_lead_phone` ON `crm2_leads` (`tenant`,`phone_norm`);
CREATE INDEX `crm2_lead_owner` ON `crm2_leads` (`tenant`,`owner`,`next_action`,`next_due`);
CREATE INDEX `crm2_lead_stage` ON `crm2_leads` (`tenant`,`stage`);
CREATE INDEX `crm2_payment_order` ON `crm2_order_payments` (`tenant`,`order_id`,`due_date`);
CREATE UNIQUE INDEX `crm2_order_code` ON `crm2_orders` (`tenant`,`code`);
CREATE INDEX `crm2_order_lead` ON `crm2_orders` (`tenant`,`lead_id`);
CREATE UNIQUE INDEX `crm2_order_active` ON `crm2_orders` (`tenant`,`product_code`) WHERE status IN ('ACTIVE','COMPLETED') AND limited = 1;
CREATE UNIQUE INDEX `crm2_product_code` ON `crm2_products` (`tenant`,`code`);
CREATE UNIQUE INDEX `crm2_runtime_key` ON `crm2_runtime` (`tenant`,`key`);
CREATE UNIQUE INDEX `crm2_staff_user` ON `crm2_staff` (`tenant`,`user_id`);
CREATE INDEX `crm2_task_assignee` ON `crm2_tasks` (`tenant`,`assignee`,`done_at`,`due_at`);
CREATE UNIQUE INDEX `crm2_task_ukey` ON `crm2_tasks` (`tenant`,`ukey`);
CREATE UNIQUE INDEX `crm2_inbound_key` ON `crm2_inbound` (`tenant`,`ext_key`);
CREATE INDEX `crm2_lead_channel` ON `crm2_leads` (`tenant`,`channel_ref`);
CREATE INDEX `push_sub_tenant` ON `push_subscriptions` (`tenant`);
CREATE INDEX `crm2_note_customer` ON `crm2_customer_notes` (`tenant`,`customer_id`,`created`);
CREATE INDEX `crm2_task_customer` ON `crm2_tasks` (`tenant`,`customer_id`);
CREATE TRIGGER shifts_validate_open BEFORE INSERT ON shifts BEGIN
 SELECT CASE WHEN NEW.status <> 'open' OR NEW.version <> 0 OR typeof(NEW.opening_cash) <> 'integer' OR NEW.opening_cash < 0 OR NEW.opening_cash > 1000000000000 THEN RAISE(ABORT,'INVALID_SHIFT') END;
END;
CREATE TRIGGER shifts_audit_open AFTER INSERT ON shifts BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('shift-open:'||NEW.id,NEW.tenant,'Mở ca',json_object('shift',NEW.id,'name',NEW.name,'openingCash',NEW.opening_cash,'actor',NEW.opened_by),NEW.opened_at);
END;
CREATE TRIGGER finance_no_update BEFORE UPDATE ON finance_entries BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER finance_no_delete BEFORE DELETE ON finance_entries BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER shifts_audit_close AFTER UPDATE ON shifts WHEN OLD.status='open' AND NEW.status='closed' BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('shift-close:'||NEW.id,NEW.tenant,'Đóng ca',json_object('shift',NEW.id,'expectedCash',NEW.expected_cash,'countedCash',NEW.counted_cash,'cashDifference',NEW.counted_cash-NEW.expected_cash,'transferDifference',NEW.counted_transfer-NEW.expected_transfer,'cardDifference',NEW.counted_card-NEW.expected_card,'note',NEW.note,'actor',NEW.closed_by),NEW.closed_at);
END;
CREATE TRIGGER shifts_no_delete BEFORE DELETE ON shifts BEGIN SELECT RAISE(ABORT,'SHIFT_IMMUTABLE'); END;
CREATE TRIGGER bookings_paid_immutable BEFORE UPDATE ON bookings WHEN OLD.status='paid' BEGIN
 SELECT CASE WHEN NEW.status<>'paid' OR NEW.amount IS NOT OLD.amount OR NEW.payment IS NOT OLD.payment THEN RAISE(ABORT,'PAID_BOOKING_IMMUTABLE') END;
END;
CREATE TRIGGER menu_validate_create BEFORE INSERT ON menu_items BEGIN
 SELECT CASE WHEN NEW.version<>0 OR NEW.active NOT IN (0,1) OR typeof(NEW.price)<>'integer' OR NEW.price<1 OR NEW.price>100000000 OR NEW.fee_bps<0 OR NEW.fee_bps>10000 OR NEW.vat_bps<0 OR NEW.vat_bps>10000 THEN RAISE(ABORT,'INVALID_MENU_ITEM') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM menu_items WHERE tenant=NEW.tenant)>=500 THEN RAISE(ABORT,'MENU_LIMIT') END;
END;
CREATE TRIGGER menu_validate_update BEFORE UPDATE ON menu_items BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.version<>OLD.version+1 OR NEW.active NOT IN (0,1) OR typeof(NEW.price)<>'integer' OR NEW.price<1 OR NEW.price>100000000 OR NEW.fee_bps<0 OR NEW.fee_bps>10000 OR NEW.vat_bps<0 OR NEW.vat_bps>10000 THEN RAISE(ABORT,'INVALID_MENU_ITEM') END;
END;
CREATE TRIGGER menu_audit_create AFTER INSERT ON menu_items BEGIN INSERT INTO audit VALUES ('menu:'||NEW.id||':0',NEW.tenant,'Thêm món',json_object('item',NEW.id,'name',NEW.name,'price',NEW.price),NEW.created); END;
CREATE TRIGGER menu_audit_update AFTER UPDATE ON menu_items BEGIN INSERT INTO audit VALUES ('menu:'||NEW.id||':'||NEW.version,NEW.tenant,'Sửa món',json_object('item',NEW.id,'oldPrice',OLD.price,'newPrice',NEW.price,'active',NEW.active),CAST(strftime('%s','now') AS INTEGER)*1000); END;
CREATE TRIGGER menu_no_delete BEFORE DELETE ON menu_items BEGIN SELECT RAISE(ABORT,'ARCHIVE_MENU_INSTEAD'); END;
CREATE TRIGGER food_validate_create BEFORE INSERT ON food_orders BEGIN
 SELECT CASE WHEN NEW.status<>'new' OR NEW.version<>0 OR NOT EXISTS(SELECT 1 FROM bookings WHERE tenant=NEW.tenant AND id=NEW.booking_id AND status IN ('playing','paused')) THEN RAISE(ABORT,'SESSION_NOT_ORDERABLE') END;
 SELECT CASE WHEN json_valid(NEW.items)<>1 THEN RAISE(ABORT,'INVALID_ORDER') END;
 SELECT CASE WHEN json_type(NEW.items)<>'array' OR json_array_length(NEW.items)<1 OR json_array_length(NEW.items)>10 OR (SELECT COUNT(DISTINCT json_extract(value,'$.itemId')) FROM json_each(NEW.items))<>json_array_length(NEW.items) THEN RAISE(ABORT,'INVALID_ORDER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) l LEFT JOIN menu_items p ON p.id=json_extract(l.value,'$.itemId') AND p.tenant=NEW.tenant WHERE p.id IS NULL OR p.active<>1 OR p.version IS NOT json_extract(l.value,'$.version') OR p.name IS NOT json_extract(l.value,'$.name') OR p.category IS NOT json_extract(l.value,'$.category') OR p.unit IS NOT json_extract(l.value,'$.unit') OR p.price IS NOT json_extract(l.value,'$.price') OR p.fee_bps IS NOT json_extract(l.value,'$.feeBps') OR p.vat_bps IS NOT json_extract(l.value,'$.vatBps') OR json_type(l.value,'$.qty') IS NOT 'integer' OR json_extract(l.value,'$.qty')<1 OR json_extract(l.value,'$.qty')>99) THEN RAISE(ABORT,'MENU_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) l WHERE json_extract(l.value,'$.subtotal') IS NOT json_extract(l.value,'$.price')*json_extract(l.value,'$.qty') OR json_extract(l.value,'$.fee') IS NOT (json_extract(l.value,'$.subtotal')*json_extract(l.value,'$.feeBps')+5000)/10000 OR json_extract(l.value,'$.vat') IS NOT ((json_extract(l.value,'$.subtotal')+json_extract(l.value,'$.fee'))*json_extract(l.value,'$.vatBps')+5000)/10000 OR json_extract(l.value,'$.total') IS NOT json_extract(l.value,'$.subtotal')+json_extract(l.value,'$.fee')+json_extract(l.value,'$.vat')) THEN RAISE(ABORT,'INVALID_ORDER_TOTAL') END;
 SELECT CASE WHEN NEW.subtotal IS NOT (SELECT SUM(json_extract(value,'$.subtotal')) FROM json_each(NEW.items)) OR NEW.fee IS NOT (SELECT SUM(json_extract(value,'$.fee')) FROM json_each(NEW.items)) OR NEW.vat IS NOT (SELECT SUM(json_extract(value,'$.vat')) FROM json_each(NEW.items)) OR NEW.total IS NOT NEW.subtotal+NEW.fee+NEW.vat OR NEW.total<1 OR NEW.total>100000000000 THEN RAISE(ABORT,'INVALID_ORDER_TOTAL') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id)>=100 OR (SELECT COUNT(*) FROM food_orders WHERE tenant=NEW.tenant AND status IN ('new','preparing','ready'))>=200 OR NEW.total+COALESCE((SELECT SUM(total) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND status<>'cancelled'),0)>100000000000 THEN RAISE(ABORT,'ORDER_LIMIT') END;
END;
CREATE TRIGGER food_audit_create AFTER INSERT ON food_orders BEGIN INSERT INTO audit VALUES ('food:'||NEW.id||':0',NEW.tenant,'Gọi món',json_object('order',NEW.id,'booking',NEW.booking_id,'total',NEW.total,'actor',NEW.actor),NEW.created); END;
CREATE TRIGGER food_validate_transition BEFORE UPDATE ON food_orders BEGIN
 SELECT CASE WHEN OLD.status IN ('served','cancelled') OR NEW.version<>OLD.version+1 OR NEW.updated<OLD.updated THEN RAISE(ABORT,'ORDER_ALREADY_FINAL') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.booking_id<>OLD.booking_id OR NEW.request_id<>OLD.request_id OR NEW.request_data<>OLD.request_data OR NEW.items<>OLD.items OR NEW.subtotal<>OLD.subtotal OR NEW.fee<>OLD.fee OR NEW.vat<>OLD.vat OR NEW.total<>OLD.total OR NEW.note<>OLD.note OR NEW.actor<>OLD.actor OR NEW.created<>OLD.created THEN RAISE(ABORT,'ORDER_SNAPSHOT_IMMUTABLE') END;
 SELECT CASE WHEN NOT ((OLD.status='new' AND NEW.status='preparing') OR (OLD.status='preparing' AND NEW.status='ready') OR (OLD.status='ready' AND NEW.status='served') OR (OLD.status IN ('new','preparing','ready') AND NEW.status='cancelled' AND length(trim(NEW.reason))>=5)) THEN RAISE(ABORT,'INVALID_ORDER_TRANSITION') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings WHERE tenant=NEW.tenant AND id=NEW.booking_id AND status IN ('playing','paused','finished')) THEN RAISE(ABORT,'SESSION_NOT_ORDERABLE') END;
END;
CREATE TRIGGER food_apply_transition AFTER UPDATE ON food_orders BEGIN
 UPDATE bookings SET food_total=food_total+NEW.total,amount= CASE WHEN status='finished' AND amount IS NOT NULL THEN amount+NEW.total ELSE amount END WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.status='served';
 INSERT INTO audit VALUES ('food:'||NEW.id||':'||NEW.version,NEW.tenant,'Trạng thái món',json_object('order',NEW.id,'from',OLD.status,'to',NEW.status,'reason',NEW.reason),NEW.updated);
END;
CREATE TRIGGER food_no_delete BEFORE DELETE ON food_orders BEGIN SELECT RAISE(ABORT,'ORDER_IMMUTABLE'); END;
CREATE TRIGGER bookings_food_consistency BEFORE UPDATE ON bookings BEGIN
 SELECT CASE WHEN NEW.food_total IS NOT COALESCE((SELECT SUM(total) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.id AND status='served'),0) THEN RAISE(ABORT,'FOOD_TOTAL_MISMATCH') END;
 SELECT CASE WHEN NEW.status IN ('finished','paid') AND NEW.golf_amount IS NOT NULL AND NEW.amount IS NOT NEW.golf_amount+NEW.food_total THEN RAISE(ABORT,'BILL_TOTAL_MISMATCH') END;
END;
CREATE TRIGGER finance_food_guard BEFORE INSERT ON finance_entries WHEN NEW.kind='payment' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND status IN ('new','preparing','ready')) THEN RAISE(ABORT,'UNSERVED_FOOD_ORDERS') END;
END;
CREATE TRIGGER stock_config_insert BEFORE INSERT ON stock_items BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM menu_items WHERE id=NEW.item_id AND tenant=NEW.tenant) OR NEW.low_level<0 OR NEW.low_level>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_items WHERE item_id=NEW.item_id) AND EXISTS(SELECT 1 FROM food_orders o,json_each(o.items) j WHERE o.tenant=NEW.tenant AND o.status IN ('new','preparing','ready') AND json_extract(j.value,'$.itemId')=NEW.item_id) THEN RAISE(ABORT,'STOCK_PENDING_ORDERS') END;
END;
CREATE TRIGGER stock_config_added AFTER INSERT ON stock_items BEGIN
 UPDATE menu_items SET version=version+1 WHERE id=NEW.item_id AND tenant=NEW.tenant;
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-config',NEW.item_id,NEW.created);
END;
CREATE TRIGGER stock_config_update BEFORE UPDATE ON stock_items BEGIN
 SELECT CASE WHEN NEW.item_id<>OLD.item_id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.low_level<0 OR NEW.low_level>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
END;
CREATE TRIGGER stock_config_updated AFTER UPDATE ON stock_items BEGIN
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-threshold',NEW.item_id || ':' || NEW.low_level,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
CREATE TRIGGER stock_config_delete BEFORE DELETE ON stock_items BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
CREATE TRIGGER stock_unit_guard BEFORE UPDATE OF unit ON menu_items WHEN NEW.unit<>OLD.unit AND EXISTS(SELECT 1 FROM stock_items WHERE item_id=OLD.id) BEGIN SELECT RAISE(ABORT,'STOCK_UNIT_LOCKED'); END;
CREATE TRIGGER stock_order_guard BEFORE INSERT ON food_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) j LEFT JOIN stock_status s ON s.id=json_extract(j.value,'$.itemId') AND s.tenant=NEW.tenant WHERE COALESCE(json_extract(j.value,'$.stockTracked'),0)<> CASE WHEN s.low_level IS NULL THEN 0 ELSE 1 END OR (s.low_level IS NOT NULL AND s.on_hand-s.reserved<json_extract(j.value,'$.qty'))) THEN RAISE(ABORT,'STOCK_UNAVAILABLE') END;
END;
CREATE TRIGGER stock_movement_guard BEFORE INSERT ON stock_movements BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_items s JOIN menu_items m ON m.id=s.item_id WHERE s.item_id=NEW.item_id AND s.tenant=NEW.tenant AND m.name=NEW.item_name AND m.unit=NEW.unit) OR typeof(NEW.qty)<>'integer' OR NEW.qty<1 OR NEW.qty>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN NOT ((NEW.kind IN ('receipt','adjust_in') AND NEW.delta=NEW.qty AND NEW.order_id IS NULL AND length(trim(NEW.note))>=5) OR (NEW.kind='adjust_out' AND NEW.delta=-NEW.qty AND NEW.order_id IS NULL AND length(trim(NEW.note))>=5) OR (NEW.kind='sale' AND NEW.delta=-NEW.qty AND EXISTS(SELECT 1 FROM food_orders o,json_each(o.items) j WHERE o.id=NEW.order_id AND o.tenant=NEW.tenant AND o.status='served' AND json_extract(j.value,'$.stockTracked')=1 AND json_extract(j.value,'$.itemId')=NEW.item_id AND json_extract(j.value,'$.qty')=NEW.qty) AND NEW.request_id='sale:' || NEW.order_id || ':' || NEW.item_id)) THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM stock_status WHERE id=NEW.item_id AND tenant=NEW.tenant AND (on_hand+NEW.delta<reserved OR on_hand+NEW.delta>1000000000)) THEN RAISE(ABORT,'STOCK_UNAVAILABLE') END;
END;
CREATE TRIGGER stock_movement_audit AFTER INSERT ON stock_movements BEGIN
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-' || NEW.kind,NEW.item_id || ':' || NEW.delta || ':' || NEW.note,NEW.created);
END;
CREATE TRIGGER stock_movement_update BEFORE UPDATE ON stock_movements BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
CREATE TRIGGER stock_movement_delete BEFORE DELETE ON stock_movements BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
CREATE TRIGGER stock_order_served AFTER UPDATE OF status ON food_orders WHEN NEW.status='served' AND OLD.status<>'served' BEGIN
 INSERT INTO stock_movements(id,tenant,item_id,item_name,unit,kind,qty,delta,request_id,signature,order_id,note,actor,created)
 SELECT lower(hex(randomblob(16))),NEW.tenant,m.id,m.name,m.unit,'sale',json_extract(j.value,'$.qty'),-json_extract(j.value,'$.qty'),'sale:' || NEW.id || ':' || m.id,'',NEW.id,'Phục vụ đơn ' || NEW.id,NEW.actor,NEW.updated
 FROM json_each(NEW.items) j JOIN menu_items m ON m.id=json_extract(j.value,'$.itemId') AND m.tenant=NEW.tenant WHERE json_extract(j.value,'$.stockTracked')=1;
END;
CREATE TRIGGER customers_validate_create BEFORE INSERT ON customers BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 THEN RAISE(ABORT,'INVALID_CUSTOMER') END;
END;
CREATE TRIGGER customers_validate_update BEFORE UPDATE ON customers BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.phone<>OLD.phone OR NEW.created<>OLD.created OR length(trim(NEW.name))<2 OR length(NEW.name)>100 THEN RAISE(ABORT,'CUSTOMER_IDENTITY_IMMUTABLE') END;
END;
CREATE TRIGGER customers_no_delete BEFORE DELETE ON customers BEGIN SELECT RAISE(ABORT,'CUSTOMER_IMMUTABLE'); END;
CREATE TRIGGER package_types_validate BEFORE INSERT ON package_types BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR typeof(NEW.price)<>'integer' OR NEW.price<=0 OR NEW.price>1000000000 OR typeof(NEW.valid_days)<>'integer' OR NEW.valid_days<1 OR NEW.valid_days>3660 OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_PACKAGE_TYPE') END;
END;
CREATE TRIGGER package_types_validate_update BEFORE UPDATE ON package_types BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR length(trim(NEW.name))<2 OR typeof(NEW.price)<>'integer' OR NEW.price<=0 OR NEW.price>1000000000 OR typeof(NEW.valid_days)<>'integer' OR NEW.valid_days<1 OR NEW.valid_days>3660 OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_PACKAGE_TYPE') END;
END;
CREATE TRIGGER package_types_no_delete BEFORE DELETE ON package_types BEGIN SELECT RAISE(ABORT,'ARCHIVE_PACKAGE_INSTEAD'); END;
CREATE TRIGGER customer_packages_validate BEFORE INSERT ON customer_packages BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NEW.source NOT IN ('sale','loyalty') OR typeof(NEW.price_paid)<>'integer' OR NEW.price_paid<0 OR (NEW.source='sale' AND NEW.price_paid<=0) OR (NEW.source='loyalty' AND NEW.price_paid<>0) OR NEW.expires<=NEW.purchased OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 THEN RAISE(ABORT,'INVALID_PACKAGE') END;
END;
CREATE TRIGGER customer_packages_audit AFTER INSERT ON customer_packages BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('package:'||NEW.id,NEW.tenant,'Bán gói',json_object('package',NEW.id,'customer',NEW.customer_id,'name',NEW.name,'source',NEW.source,'price',NEW.price_paid,'actor',NEW.actor),NEW.purchased);
END;
CREATE TRIGGER customer_packages_no_update BEFORE UPDATE ON customer_packages BEGIN SELECT RAISE(ABORT,'PACKAGE_IMMUTABLE'); END;
CREATE TRIGGER customer_packages_no_delete BEFORE DELETE ON customer_packages BEGIN SELECT RAISE(ABORT,'PACKAGE_IMMUTABLE'); END;
CREATE TRIGGER package_ledger_no_update BEFORE UPDATE ON package_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER package_ledger_no_delete BEFORE DELETE ON package_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER package_redemptions_audit AFTER INSERT ON package_redemptions BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('redeem:'||NEW.id,NEW.tenant,'Trả bằng gói',json_object('booking',NEW.booking_id,'package',NEW.package_id,'kind',NEW.kind,'covered',NEW.covered,'actor',NEW.actor),NEW.created);
END;
CREATE TRIGGER package_redemptions_no_update BEFORE UPDATE ON package_redemptions BEGIN SELECT RAISE(ABORT,'REDEMPTION_IMMUTABLE'); END;
CREATE TRIGGER package_redemptions_no_delete BEFORE DELETE ON package_redemptions BEGIN SELECT RAISE(ABORT,'REDEMPTION_IMMUTABLE'); END;
CREATE TRIGGER loyalty_ledger_validate BEFORE INSERT ON loyalty_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NEW.reason NOT IN ('earn','redeem','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 THEN RAISE(ABORT,'INVALID_LEDGER_ENTRY') END;
 SELECT CASE WHEN NEW.reason='earn' AND (NEW.delta<>1 OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND tenant=NEW.tenant AND status='paid' AND service IN ('9','18'))) THEN RAISE(ABORT,'INVALID_EARN') END;
 SELECT CASE WHEN NEW.reason='redeem' AND NEW.delta<>-10 THEN RAISE(ABORT,'INVALID_REDEEM') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM loyalty_ledger WHERE tenant=NEW.tenant AND customer_id=NEW.customer_id),0)+NEW.delta<0 THEN RAISE(ABORT,'POINTS_INSUFFICIENT') END;
END;
CREATE TRIGGER loyalty_ledger_no_update BEFORE UPDATE ON loyalty_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER loyalty_ledger_no_delete BEFORE DELETE ON loyalty_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER loyalty_earn_on_paid AFTER UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' AND NEW.service IN ('9','18') BEGIN
 INSERT OR IGNORE INTO loyalty_ledger(id,tenant,customer_id,delta,reason,booking_id,actor,created) SELECT 'earn:'||NEW.id,NEW.tenant,c.id,1,'earn',NEW.id,'system',CAST(strftime('%s','now') AS INTEGER)*1000 FROM customers c WHERE c.tenant=NEW.tenant AND c.phone=(SELECT CASE WHEN substr(d,1,3)='+84' THEN '0'||substr(d,4) WHEN substr(d,1,2)='84' AND length(d)>=11 THEN '0'||substr(d,3) ELSE d END FROM (SELECT replace(replace(replace(replace(replace(NEW.phone,' ',''),'-',''),'(',''),')',''),'.','') AS d));
END;
CREATE TRIGGER booking_requests_validate BEFORE INSERT ON booking_requests BEGIN
 SELECT CASE WHEN NEW.status<>'pending' OR NEW.room IS NOT NULL OR NEW.booking_id IS NOT NULL OR NEW.handled_by IS NOT NULL THEN RAISE(ABORT,'INVALID_REQUEST_STATE') END;
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR NEW.service NOT IN ('gdr','9','18') OR NEW.vip NOT IN (0,1) OR typeof(NEW.people)<>'integer' OR NEW.people<1 OR NEW.people>4 OR typeof(NEW.start)<>'integer' OR NEW.start<NEW.created-300000 OR typeof(NEW.minutes)<>'integer' OR NEW.minutes<0 OR NEW.minutes>720 OR length(NEW.note)>300 OR NOT json_valid(NEW.quote) OR length(NEW.code_hash)<20 THEN RAISE(ABORT,'INVALID_REQUEST') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE tenant=NEW.tenant AND phone=NEW.phone AND status='pending')>=3 THEN RAISE(ABORT,'TOO_MANY_PENDING_PHONE') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE tenant=NEW.tenant AND status='pending')>=300 THEN RAISE(ABORT,'TOO_MANY_PENDING') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE ip_hash=NEW.ip_hash AND created>NEW.created-3600000)>=10 THEN RAISE(ABORT,'RATE_LIMITED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM booking_requests WHERE tenant=NEW.tenant AND phone=NEW.phone AND start=NEW.start AND service=NEW.service AND status='pending') THEN RAISE(ABORT,'DUPLICATE_REQUEST') END;
END;
CREATE TRIGGER booking_requests_update BEFORE UPDATE ON booking_requests BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.code_hash<>OLD.code_hash OR NEW.name<>OLD.name OR NEW.phone<>OLD.phone OR NEW.service<>OLD.service OR NEW.vip<>OLD.vip OR NEW.people<>OLD.people OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes OR NEW.note<>OLD.note OR NEW.quote<>OLD.quote OR NEW.ip_hash<>OLD.ip_hash OR NEW.created<>OLD.created THEN RAISE(ABORT,'REQUEST_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'pending' THEN RAISE(ABORT,'REQUEST_CLOSED') END;
 SELECT CASE WHEN NEW.status NOT IN ('pending','confirmed','rejected','cancelled') THEN RAISE(ABORT,'INVALID_REQUEST_STATE') END;
 SELECT CASE WHEN NEW.status='confirmed' AND (NEW.room IS NULL OR NEW.booking_id IS NULL OR NEW.handled_by IS NULL OR NEW.handled_at IS NULL) THEN RAISE(ABORT,'INVALID_CONFIRMATION') END;
 SELECT CASE WHEN NEW.status='rejected' AND (length(trim(NEW.reason))<3 OR NEW.handled_by IS NULL OR NEW.handled_at IS NULL) THEN RAISE(ABORT,'REJECTION_REASON_REQUIRED') END;
 SELECT CASE WHEN NEW.status='cancelled' AND (NEW.handled_by IS NOT NULL OR NEW.booking_id IS NOT NULL) THEN RAISE(ABORT,'INVALID_CANCEL') END;
END;
CREATE TRIGGER booking_requests_audit AFTER UPDATE ON booking_requests WHEN OLD.status='pending' AND NEW.status<>'pending' BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('request:'||NEW.id,NEW.tenant,'Yêu cầu đặt online',json_object('request',NEW.id,'status',NEW.status,'booking',NEW.booking_id,'actor',NEW.handled_by),COALESCE(NEW.handled_at,NEW.created));
END;
CREATE TRIGGER booking_requests_no_delete BEFORE DELETE ON booking_requests BEGIN SELECT RAISE(ABORT,'REQUEST_IMMUTABLE'); END;
CREATE TRIGGER coaches_validate_insert BEFORE INSERT ON coaches BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR length(NEW.phone)>20 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_COACH') END;
 SELECT CASE WHEN NEW.user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=NEW.user_id AND tenant=NEW.tenant AND role='coach') THEN RAISE(ABORT,'COACH_USER_INVALID') END;
END;
CREATE TRIGGER coaches_validate_update BEFORE UPDATE ON coaches BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR length(trim(NEW.name))<2 OR length(NEW.name)>100 OR length(NEW.phone)>20 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_COACH') END;
 SELECT CASE WHEN NEW.user_id IS NOT NULL AND NEW.user_id IS NOT OLD.user_id AND NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=NEW.user_id AND tenant=NEW.tenant AND role='coach') THEN RAISE(ABORT,'COACH_USER_INVALID') END;
END;
CREATE TRIGGER coaches_no_delete BEFORE DELETE ON coaches BEGIN SELECT RAISE(ABORT,'COACH_IMMUTABLE'); END;
CREATE TRIGGER lessons_validate_insert BEFORE INSERT ON lessons BEGIN
 SELECT CASE WHEN NEW.status<>'scheduled' THEN RAISE(ABORT,'INVALID_LESSON_STATE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM coaches WHERE id=NEW.coach_id AND tenant=NEW.tenant AND active=1) THEN RAISE(ABORT,'COACH_NOT_FOUND') END;
 SELECT CASE WHEN NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN length(trim(NEW.customer_name))<2 OR length(NEW.customer_name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR typeof(NEW.start)<>'integer' OR typeof(NEW.minutes)<>'integer' OR NEW.minutes<15 OR NEW.minutes>480 OR NEW.minutes%15<>0 OR NEW.start<NEW.created-300000 OR (NEW.price IS NOT NULL AND (typeof(NEW.price)<>'integer' OR NEW.price<0 OR NEW.price>1000000000)) OR length(NEW.note)>500 OR length(NEW.coach_note)>500 THEN RAISE(ABORT,'INVALID_LESSON') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM lessons WHERE tenant=NEW.tenant AND coach_id=NEW.coach_id AND status<>'cancelled' AND start<NEW.start+NEW.minutes*60000 AND start+minutes*60000>NEW.start) THEN RAISE(ABORT,'COACH_BUSY') END;
END;
CREATE TRIGGER lessons_validate_update BEFORE UPDATE ON lessons BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.request_id<>OLD.request_id OR NEW.actor<>OLD.actor OR NEW.customer_name<>OLD.customer_name OR NEW.phone<>OLD.phone OR NEW.customer_id IS NOT OLD.customer_id THEN RAISE(ABORT,'LESSON_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('scheduled','done','cancelled','no_show') OR (OLD.status<>'scheduled' AND NEW.status<>OLD.status) THEN RAISE(ABORT,'INVALID_LESSON_STATE') END;
 SELECT CASE WHEN OLD.status<>'scheduled' AND (NEW.coach_id<>OLD.coach_id OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes OR NEW.room IS NOT OLD.room OR NEW.price IS NOT OLD.price OR NEW.note<>OLD.note) THEN RAISE(ABORT,'LESSON_CLOSED') END;
 SELECT CASE WHEN length(NEW.coach_note)>500 OR length(NEW.note)>500 OR NEW.minutes<15 OR NEW.minutes>480 OR NEW.minutes%15<>0 THEN RAISE(ABORT,'INVALID_LESSON') END;
 SELECT CASE WHEN NEW.coach_id<>OLD.coach_id AND NOT EXISTS(SELECT 1 FROM coaches WHERE id=NEW.coach_id AND tenant=NEW.tenant AND active=1) THEN RAISE(ABORT,'COACH_NOT_FOUND') END;
 SELECT CASE WHEN NEW.status='scheduled' AND (NEW.coach_id<>OLD.coach_id OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes) AND EXISTS(SELECT 1 FROM lessons WHERE tenant=NEW.tenant AND id<>NEW.id AND coach_id=NEW.coach_id AND status<>'cancelled' AND start<NEW.start+NEW.minutes*60000 AND start+minutes*60000>NEW.start) THEN RAISE(ABORT,'COACH_BUSY') END;
END;
CREATE TRIGGER lessons_audit_insert AFTER INSERT ON lessons BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('lesson:'||NEW.id,NEW.tenant,'Đặt buổi học',json_object('lesson',NEW.id,'coach',NEW.coach_id,'start',NEW.start,'minutes',NEW.minutes,'actor',NEW.actor),NEW.created);
END;
CREATE TRIGGER lessons_audit_status AFTER UPDATE OF status ON lessons WHEN NEW.status<>OLD.status BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('lesson-status:'||NEW.id||':'||NEW.status,NEW.tenant,'Buổi học '||NEW.status,json_object('lesson',NEW.id,'status',NEW.status),CAST(strftime('%s','now') AS INTEGER)*1000);
END;
CREATE TRIGGER lessons_no_delete BEFORE DELETE ON lessons BEGIN SELECT RAISE(ABORT,'LESSON_IMMUTABLE'); END;
CREATE TRIGGER integrations_validate_update BEFORE UPDATE ON integrations BEGIN
 SELECT CASE WHEN NEW.tenant<>OLD.tenant OR NEW.provider<>OLD.provider OR length(NEW.key_hash)<20 OR length(NEW.key_hash)>100 THEN RAISE(ABORT,'INVALID_INTEGRATION') END;
END;
CREATE TRIGGER bank_tx_validate BEFORE INSERT ON bank_transactions BEGIN
 SELECT CASE WHEN NEW.status<>'received' OR NEW.booking_id IS NOT NULL THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
 SELECT CASE WHEN typeof(NEW.amount)<>'integer' OR NEW.amount<=0 OR NEW.amount>1000000000000 OR length(NEW.external_id)<1 OR length(NEW.external_id)>100 OR length(NEW.content)>500 OR length(NEW.account)>40 OR length(NEW.reference)>100 OR typeof(NEW.tx_time)<>'integer' THEN RAISE(ABORT,'INVALID_BANK_TX') END;
END;
CREATE TRIGGER bank_tx_update BEFORE UPDATE ON bank_transactions BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.external_id<>OLD.external_id OR NEW.amount<>OLD.amount OR NEW.content<>OLD.content OR NEW.account<>OLD.account OR NEW.reference<>OLD.reference OR NEW.tx_time<>OLD.tx_time OR NEW.code IS NOT OLD.code OR NEW.received<>OLD.received THEN RAISE(ABORT,'BANK_TX_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'received' THEN RAISE(ABORT,'BANK_TX_CLOSED') END;
 SELECT CASE WHEN NEW.status NOT IN ('received','used','ignored') THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
 SELECT CASE WHEN NEW.status='used' AND (NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment' AND method='transfer' AND amount=NEW.amount)) THEN RAISE(ABORT,'BANK_TX_NOT_PAID') END;
 SELECT CASE WHEN NEW.status<>'used' AND NEW.booking_id IS NOT NULL THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
END;
CREATE TRIGGER bank_tx_no_delete BEFORE DELETE ON bank_transactions BEGIN SELECT RAISE(ABORT,'BANK_TX_IMMUTABLE'); END;
CREATE TRIGGER bookings_paid_requires_ledger BEFORE UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 SELECT CASE WHEN NOT (COALESCE((SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment'),0)>0 AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')=NEW.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id),0) AND ((NEW.payment='mixed' AND (SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')>1) OR (NEW.payment IN ('cash','transfer','card') AND NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method<>NEW.payment) AND EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method=NEW.payment)))) AND NOT (NEW.payment='package' AND EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id AND r.covered=NEW.amount) AND EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use')) THEN RAISE(ABORT,'PAYMENT_REQUIRES_LEDGER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use') THEN RAISE(ABORT,'REDEMPTION_WITHOUT_USE') END;
END;
CREATE TRIGGER package_ledger_validate BEFORE INSERT ON package_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages WHERE id=NEW.package_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'PACKAGE_NOT_FOUND') END;
 SELECT CASE WHEN NEW.kind NOT IN ('holes9','holes18','gdr') OR NEW.reason NOT IN ('grant','use','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 THEN RAISE(ABORT,'INVALID_LEDGER_ENTRY') END;
 SELECT CASE WHEN NEW.reason='grant' AND (NEW.delta<=0 OR NOT EXISTS(SELECT 1 FROM customer_packages p,json_each(p.grants) j WHERE p.id=NEW.package_id AND json_extract(j.value,'$.kind')=NEW.kind AND json_extract(j.value,'$.qty')=NEW.delta) OR EXISTS(SELECT 1 FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind AND reason='grant')) THEN RAISE(ABORT,'INVALID_GRANT') END;
 SELECT CASE WHEN NEW.reason='use' AND (COALESCE(NEW.delta<>-(SELECT r.units FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id AND r.package_id=NEW.package_id AND r.kind=NEW.kind),1) OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id AND r.package_id=NEW.package_id AND r.kind=NEW.kind) OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires)) THEN RAISE(ABORT,'PACKAGE_USE_INVALID') END;
 SELECT CASE WHEN NEW.reason='adjust' AND length(trim(NEW.note))<3 THEN RAISE(ABORT,'ADJUST_REASON_REQUIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)+NEW.delta<0 THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
END;
CREATE TRIGGER package_redemptions_validate BEFORE INSERT ON package_redemptions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.golf_amount IS NOT NULL AND b.golf_amount>0 AND b.golf_amount=NEW.covered AND NEW.units>=1 AND (b.service='gdr' OR NEW.units=1) AND ((b.service='9' AND NEW.kind='holes9') OR (b.service='18' AND NEW.kind='holes18') OR (b.service='gdr' AND NEW.kind='gdr'))) THEN RAISE(ABORT,'BOOKING_NOT_REDEEMABLE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p JOIN customers c ON c.id=p.customer_id JOIN bookings b ON b.id=NEW.booking_id WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND c.phone=(SELECT CASE WHEN substr(d,1,3)='+84' THEN '0'||substr(d,4) WHEN substr(d,1,2)='84' AND length(d)>=11 THEN '0'||substr(d,3) ELSE d END FROM (SELECT replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') AS d))) THEN RAISE(ABORT,'PACKAGE_CUSTOMER_MISMATCH') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires) THEN RAISE(ABORT,'PACKAGE_EXPIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)<NEW.units THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_packages p JOIN bookings b ON b.id=NEW.booking_id WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.room='standard' AND b.room LIKE 'vip%') THEN RAISE(ABORT,'PACKAGE_ROOM_MISMATCH') END;
END;
CREATE TRIGGER member_accounts_update BEFORE UPDATE ON member_accounts BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.phone<>OLD.phone OR NEW.created<>OLD.created OR (OLD.verified=1 AND NEW.verified=0) OR NEW.verified NOT IN (0,1) THEN RAISE(ABORT,'ACCOUNT_IMMUTABLE') END;
END;
CREATE TRIGGER package_orders_validate BEFORE INSERT ON package_orders BEGIN
 SELECT CASE WHEN NEW.status<>'pending' OR NEW.package_id IS NOT NULL OR NEW.handled_by IS NOT NULL THEN RAISE(ABORT,'INVALID_ORDER_STATE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM package_types WHERE id=NEW.type_id AND tenant=NEW.tenant AND active=1 AND name=NEW.name AND price=NEW.price) THEN RAISE(ABORT,'PACKAGE_TYPE_UNAVAILABLE') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM package_orders WHERE tenant=NEW.tenant AND customer_id=NEW.customer_id AND status='pending')>=3 THEN RAISE(ABORT,'TOO_MANY_PENDING_ORDERS') END;
END;
CREATE TRIGGER package_orders_update BEFORE UPDATE ON package_orders BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.type_id<>OLD.type_id OR NEW.name<>OLD.name OR NEW.price<>OLD.price OR NEW.created<>OLD.created OR OLD.status<>'pending' OR NEW.status NOT IN ('confirmed','rejected','cancelled','pending') THEN RAISE(ABORT,'ORDER_IMMUTABLE') END;
END;
CREATE TRIGGER package_orders_no_delete BEFORE DELETE ON package_orders BEGIN SELECT RAISE(ABORT,'ORDER_IMMUTABLE'); END;
CREATE TRIGGER bill_discounts_validate BEFORE INSERT ON bill_discounts BEGIN
 SELECT CASE WHEN typeof(NEW.amount)<>'integer' OR NEW.amount<=0 OR length(trim(NEW.reason))<3 OR length(NEW.reason)>300 THEN RAISE(ABORT,'INVALID_DISCOUNT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.golf_amount IS NOT NULL AND NEW.amount<b.golf_amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id) AND NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id)) THEN RAISE(ABORT,'BOOKING_NOT_DISCOUNTABLE') END;
END;
CREATE TRIGGER bill_discounts_apply AFTER INSERT ON bill_discounts BEGIN
 UPDATE bookings SET golf_amount=golf_amount-NEW.amount,amount=amount-NEW.amount WHERE id=NEW.booking_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('discount:'||NEW.id,NEW.tenant,'Giảm giá phiếu',json_object('booking',NEW.booking_id,'amount',NEW.amount,'reason',NEW.reason,'actor',NEW.actor),NEW.created);
END;
CREATE TRIGGER bill_discounts_immutable BEFORE UPDATE ON bill_discounts BEGIN SELECT RAISE(ABORT,'DISCOUNT_IMMUTABLE'); END;
CREATE TRIGGER bill_discounts_no_delete BEFORE DELETE ON bill_discounts BEGIN SELECT RAISE(ABORT,'DISCOUNT_IMMUTABLE'); END;
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out','refund') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.part NOT IN (0,1,2) OR (NEW.part=2)<>(NEW.kind='refund') OR (NEW.part=1 AND (NEW.kind<>'payment' OR NEW.package_id IS NOT NULL OR NEW.booking_id IS NULL)) THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind IN ('cash_in','cash_out') AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NULL AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND ((NEW.part=0 AND b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)=NEW.amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment')) OR (NEW.part=1 AND NEW.amount<=b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)-COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment'),0)))) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NOT NULL AND (NEW.booking_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.source='sale' AND p.price_paid=NEW.amount)) THEN RAISE(ABORT,'PACKAGE_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind<>'payment' AND NEW.package_id IS NOT NULL THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='refund' AND (NEW.package_id IS NOT NULL OR length(trim(NEW.note))<3 OR NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='paid') OR NEW.amount > COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='payment' AND e.method=NEW.method),0) - COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='refund' AND e.method=NEW.method),0)) THEN RAISE(ABORT,'REFUND_NOT_ALLOWED') END;
 SELECT CASE WHEN (NEW.kind='cash_out' OR (NEW.kind='refund' AND NEW.method='cash')) AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind IN ('cash_out','refund') THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
END;
CREATE TRIGGER finance_apply_entry AFTER INSERT ON finance_entries BEGIN
 UPDATE bookings SET status='paid',payment=IIF((SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')>1,'mixed',NEW.method) WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.kind='payment' AND status='finished' AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')=amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id),0);
 UPDATE shifts SET version=version+1 WHERE id=NEW.shift_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('finance:'||NEW.id,NEW.tenant,IIF(NEW.kind='refund','Hoàn tiền','Ghi sổ tiền'),json_object('shift',NEW.shift_id,'entry',NEW.id,'kind',NEW.kind,'method',NEW.method,'amount',NEW.amount,'booking',NEW.booking_id,'actor',NEW.actor,'part',NEW.part),NEW.created);
END;
CREATE TRIGGER shifts_validate_close BEFORE UPDATE ON shifts BEGIN
 SELECT CASE WHEN OLD.status='closed' THEN RAISE(ABORT,'SHIFT_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.name<>OLD.name OR NEW.opened_by<>OLD.opened_by OR NEW.opened_at<>OLD.opened_at OR NEW.opening_cash<>OLD.opening_cash THEN RAISE(ABORT,'SHIFT_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('open','closed') OR NEW.version<>OLD.version+1 THEN RAISE(ABORT,'INVALID_SHIFT_TRANSITION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.closed_by IS NULL OR NEW.closed_at IS NULL OR NEW.closed_at<NEW.opened_at OR typeof(NEW.counted_cash)<>'integer' OR typeof(NEW.counted_transfer)<>'integer' OR typeof(NEW.counted_card)<>'integer' OR NEW.counted_cash<0 OR NEW.counted_transfer<0 OR NEW.counted_card<0) THEN RAISE(ABORT,'INVALID_RECONCILIATION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.expected_cash IS NOT OLD.opening_cash+COALESCE((SELECT SUM(CASE WHEN kind IN ('cash_out','refund') THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND method='cash'),0) OR NEW.expected_transfer IS NOT COALESCE((SELECT SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind IN ('payment','refund') AND method='transfer'),0) OR NEW.expected_card IS NOT COALESCE((SELECT SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind IN ('payment','refund') AND method='card'),0)) THEN RAISE(ABORT,'RECONCILIATION_CHANGED') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.counted_cash<>NEW.expected_cash OR NEW.counted_transfer<>NEW.expected_transfer OR NEW.counted_card<>NEW.expected_card) AND length(trim(COALESCE(NEW.note,'')))<5 THEN RAISE(ABORT,'DIFFERENCE_REASON_REQUIRED') END;
END;
CREATE TRIGGER member_accounts_validate BEFORE INSERT ON member_accounts BEGIN
 SELECT CASE WHEN NEW.verified<>0 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR length(NEW.email)>200 OR length(NEW.password_hash)<20 THEN RAISE(ABORT,'INVALID_ACCOUNT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant AND phone=NEW.phone) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM member_accounts WHERE tenant=NEW.tenant AND created>NEW.created-3600000)>=100 THEN RAISE(ABORT,'RATE_LIMITED') END;
END;
CREATE TRIGGER customers_birthday_valid BEFORE UPDATE OF birthday ON customers BEGIN
 SELECT CASE WHEN NEW.birthday<>'' AND NEW.birthday NOT GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND NEW.birthday NOT GLOB '[01][0-9]-[0-3][0-9]' THEN RAISE(ABORT,'INVALID_BIRTHDAY') END;
END;
CREATE TRIGGER crm_tasks_validate BEFORE INSERT ON crm_tasks BEGIN
 SELECT CASE WHEN NEW.status<>'open' OR NEW.handled_by IS NOT NULL OR NEW.handled_at IS NOT NULL OR length(trim(NEW.title))<2 OR length(NEW.title)>200 OR length(NEW.rule)<2 OR length(NEW.key)<3 OR NOT json_valid(NEW.data) OR typeof(NEW.due)<>'integer' THEN RAISE(ABORT,'INVALID_TASK') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
END;
CREATE TRIGGER crm_tasks_update BEFORE UPDATE ON crm_tasks BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.rule<>OLD.rule OR NEW.key<>OLD.key OR NEW.title<>OLD.title OR NEW.data<>OLD.data OR NEW.created<>OLD.created THEN RAISE(ABORT,'TASK_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'open' THEN RAISE(ABORT,'TASK_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('open','done','skipped') OR (NEW.status<>'open' AND (NEW.handled_by IS NULL OR NEW.handled_at IS NULL)) OR length(NEW.note)>1000 THEN RAISE(ABORT,'INVALID_TASK_TRANSITION') END;
END;
CREATE TRIGGER crm_tasks_no_delete BEFORE DELETE ON crm_tasks BEGIN SELECT RAISE(ABORT,'TASK_IMMUTABLE'); END;
CREATE TRIGGER crm_interactions_validate BEFORE INSERT ON crm_interactions BEGIN
 SELECT CASE WHEN NEW.channel NOT IN ('call','zalo','sms','visit','email','note') OR length(trim(NEW.content))<1 OR length(NEW.content)>1000 THEN RAISE(ABORT,'INVALID_INTERACTION') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
END;
CREATE TRIGGER crm_interactions_immutable BEFORE UPDATE ON crm_interactions BEGIN SELECT RAISE(ABORT,'INTERACTION_IMMUTABLE'); END;
CREATE TRIGGER crm_interactions_no_delete BEFORE DELETE ON crm_interactions BEGIN SELECT RAISE(ABORT,'INTERACTION_IMMUTABLE'); END;
CREATE TRIGGER crm_agents_validate BEFORE INSERT ON crm_agents BEGIN
 SELECT CASE WHEN NEW.receives_leads NOT IN (0,1) OR NEW.on_duty NOT IN (0,1) OR length(NEW.email)>200 OR length(NEW.zalo_id)>100 THEN RAISE(ABORT,'INVALID_AGENT') END;
END;
CREATE TRIGGER crm_agents_update BEFORE UPDATE ON crm_agents BEGIN
 SELECT CASE WHEN NEW.tenant<>OLD.tenant OR NEW.user_id<>OLD.user_id OR NEW.receives_leads NOT IN (0,1) OR NEW.on_duty NOT IN (0,1) OR length(NEW.email)>200 OR length(NEW.zalo_id)>100 THEN RAISE(ABORT,'INVALID_AGENT') END;
END;
CREATE TRIGGER crm_leads_validate BEFORE INSERT ON crm_leads BEGIN
 SELECT CASE WHEN NEW.source NOT IN ('facebook','zalo','website','ads','manual') OR NEW.status NOT IN ('queued','assigned') OR length(NEW.name)>100 OR length(NEW.need)>20 OR NEW.guests<0 OR NEW.guests>1000 OR length(NEW.message)>2000 THEN RAISE(ABORT,'INVALID_LEAD') END;
 SELECT CASE WHEN NEW.phone<>'' AND (NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11) THEN RAISE(ABORT,'INVALID_LEAD') END;
END;
CREATE TRIGGER crm_leads_update BEFORE UPDATE ON crm_leads BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.source<>OLD.source OR NEW.received_at<>OLD.received_at OR (OLD.phone<>'' AND NEW.phone<>OLD.phone) THEN RAISE(ABORT,'LEAD_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status IN ('booked','lost') THEN RAISE(ABORT,'LEAD_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('queued','assigned','contacted','booked','lost') OR (OLD.first_call_at IS NOT NULL AND NEW.first_call_at IS NOT OLD.first_call_at) OR NEW.escalations<OLD.escalations THEN RAISE(ABORT,'INVALID_LEAD_TRANSITION') END;
END;
CREATE TRIGGER crm_leads_no_delete BEFORE DELETE ON crm_leads BEGIN SELECT RAISE(ABORT,'LEAD_IMMUTABLE'); END;
CREATE TRIGGER crm_contacts_validate BEFORE INSERT ON crm_lead_contacts BEGIN
 SELECT CASE WHEN length(NEW.ext_key)<3 OR length(NEW.ext_key)>200 OR length(NEW.message)>2000 THEN RAISE(ABORT,'INVALID_CONTACT') END;
END;
CREATE TRIGGER crm_contacts_immutable BEFORE UPDATE ON crm_lead_contacts BEGIN SELECT RAISE(ABORT,'CONTACT_IMMUTABLE'); END;
CREATE TRIGGER crm_contacts_no_delete BEFORE DELETE ON crm_lead_contacts BEGIN SELECT RAISE(ABORT,'CONTACT_IMMUTABLE'); END;
CREATE TRIGGER crm_events_validate BEFORE INSERT ON crm_lead_events BEGIN
 SELECT CASE WHEN length(NEW.kind)<2 OR length(NEW.kind)>40 OR NOT json_valid(NEW.detail) THEN RAISE(ABORT,'INVALID_EVENT') END;
END;
CREATE TRIGGER crm_events_immutable BEFORE UPDATE ON crm_lead_events BEGIN SELECT RAISE(ABORT,'EVENT_IMMUTABLE'); END;
CREATE TRIGGER crm_events_no_delete BEFORE DELETE ON crm_lead_events BEGIN SELECT RAISE(ABORT,'EVENT_IMMUTABLE'); END;
CREATE TRIGGER crm_outbox_validate BEFORE INSERT ON crm_outbox BEGIN
 SELECT CASE WHEN NEW.channel NOT IN ('email','zalo') OR NEW.status<>'pending' OR NEW.audience NOT IN ('staff','customer') OR length(NEW.body)<1 OR length(NEW.body)>4000 OR length(NEW.ukey)<3 THEN RAISE(ABORT,'INVALID_MESSAGE') END;
END;
CREATE TRIGGER crm_outbox_update BEFORE UPDATE ON crm_outbox BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.ukey<>OLD.ukey OR NEW.channel<>OLD.channel OR NEW.recipient<>OLD.recipient OR NEW.body<>OLD.body OR NEW.created<>OLD.created THEN RAISE(ABORT,'MESSAGE_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status NOT IN ('pending','failed') THEN RAISE(ABORT,'MESSAGE_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('pending','sent','failed','cancelled','expired') THEN RAISE(ABORT,'INVALID_MESSAGE') END;
END;
CREATE TRIGGER crm_outbox_no_delete BEFORE DELETE ON crm_outbox BEGIN SELECT RAISE(ABORT,'MESSAGE_IMMUTABLE'); END;
CREATE TRIGGER customers_consent_valid BEFORE UPDATE OF marketing_consent ON customers BEGIN
 SELECT CASE WHEN NEW.marketing_consent NOT IN (0,1) THEN RAISE(ABORT,'INVALID_CONSENT') END;
END;
CREATE TRIGGER integrations_validate BEFORE INSERT ON integrations BEGIN
 SELECT CASE WHEN NEW.provider NOT IN ('sepay','lead_website','lead_ads') OR length(NEW.key_hash)<20 OR length(NEW.key_hash)>100 THEN RAISE(ABORT,'INVALID_INTEGRATION') END;
END;
CREATE VIEW stock_status AS
SELECT m.id,m.tenant,m.name,m.unit,s.low_level,
 COALESCE((SELECT sum(delta) FROM stock_movements x WHERE x.item_id=m.id AND x.tenant=m.tenant),0) AS on_hand,
 COALESCE((SELECT sum(json_extract(j.value,'$.qty')) FROM food_orders o,json_each(o.items) j WHERE o.tenant=m.tenant AND o.status IN ('new','preparing','ready') AND json_extract(j.value,'$.itemId')=m.id AND json_extract(j.value,'$.stockTracked')=1),0) AS reserved
FROM menu_items m LEFT JOIN stock_items s ON s.item_id=m.id AND s.tenant=m.tenant;
CREATE VIEW package_balances AS SELECT tenant,package_id,kind,SUM(delta) AS remaining FROM package_ledger GROUP BY tenant,package_id,kind;
CREATE VIEW customer_points AS SELECT tenant,customer_id,SUM(delta) AS points FROM loyalty_ledger GROUP BY tenant,customer_id;
CREATE VIEW crm_visits AS SELECT c.tenant AS tenant,c.id AS customer_id,b.id AS booking_id,b.service AS service,b.finished AS finished,b.amount AS amount FROM customers c JOIN bookings b ON b.tenant=c.tenant AND b.status='paid' AND b.finished IS NOT NULL AND c.phone=CASE WHEN replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') LIKE '+84%' THEN '0'||substr(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''),4) WHEN replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') LIKE '84%' AND length(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''))>=11 THEN '0'||substr(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''),3) ELSE replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') END;
