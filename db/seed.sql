-- 초기 드레스 데이터 (피그마 기준). 가격·수량은 임시값이에요!
-- 관리자 화면 > 드레스 관리에서 바꿀 수 있어요.

insert into dresses (id, name, price, price_usd, image, model_size, model_spec, sort) values
  ('green-tinkerbell', '그린 팅커벨',  30000, null, '/images/dresses/green-tinkerbell.jpg', 'M', '160/00', 1),
  ('black-modern',     '블랙 모던',    30000, null, '/images/dresses/black-modern.jpg',     'M', '160/00', 2),
  ('white-tweed',      '화이트 트위드', 30000, null, '/images/dresses/white-tweed.jpg',      'M', '160/00', 3)
on conflict (id) do nothing;

insert into dress_stock (dress_id, size, quantity, sort) values
  ('green-tinkerbell', 'S', 1, 1), ('green-tinkerbell', 'M', 1, 2), ('green-tinkerbell', 'L', 1, 3),
  ('black-modern',     'S', 1, 1), ('black-modern',     'M', 1, 2), ('black-modern',     'L', 1, 3),
  ('white-tweed',      'S', 1, 1), ('white-tweed',      'M', 1, 2), ('white-tweed',      'L', 1, 3)
on conflict (dress_id, size) do nothing;

-- 드레스 영어·중국어 이름 (비어 있을 때만 채움)
update dresses set name_en = 'Green Tinker Bell', name_zh = '绿色小叮当' where id = 'green-tinkerbell' and name_en is null;
update dresses set name_en = 'Black Modern',      name_zh = '黑色摩登'   where id = 'black-modern'     and name_en is null;
update dresses set name_en = 'White Tweed',       name_zh = '白色粗花呢' where id = 'white-tweed'      and name_en is null;
