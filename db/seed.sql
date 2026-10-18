-- 드레스 데이터. 처음 한 번만 들어가고, 그 뒤로는 관리자 화면 > 드레스 관리에서 바꾼 값이 유지돼요.
-- 사이즈별 수량은 1벌씩이에요 (관리자 화면에서 바꿀 수 있어요).
-- 드레스 선택 화면은 비싼 가격순으로 보여요 (같은 가격이면 sort 순서).
-- 상세 사진·사이즈표는 src/lib/dressMedia.ts 에 있어요.

insert into dresses (id, name, name_en, name_zh, price, price_usd, image, model_size, model_spec, sort) values
  ('green-tinkerbell',  '그린팅커벨',       'Green Tinker Bell', '绿色小叮当',   27000, null, '/images/dresses/green-tinkerbell-1.jpg',  null, null, 1),
  ('black-silk',        '블랙실크',         'Black Silk',        '黑色丝绸',     27000, null, '/images/dresses/black-silk-1.jpg',        null, null, 2),
  ('white-lace-warmer', '화이트레이스워머', 'White Lace Warmer', '白色蕾丝袖套', 27000, null, '/images/dresses/white-lace-warmer-1.jpg', null, null, 3),
  ('cinderella',        '신데렐라',         'Cinderella',        '灰姑娘',       27000, null, '/images/dresses/cinderella-1.jpg',        null, null, 4),
  ('pink-prom',         '핑크프롬',         'Pink Prom',         '粉色舞会',     23000, null, '/images/dresses/pink-prom-1.jpg',         null, null, 5),
  ('black-velvet',      '블랙벨벳',         'Black Velvet',      '黑色丝绒',     23000, null, '/images/dresses/black-velvet-1.jpg',      null, null, 6)
on conflict (id) do nothing;

insert into dress_stock (dress_id, size, quantity, sort) values
  ('green-tinkerbell',  'XS', 1, 1), ('green-tinkerbell', 'S', 1, 2), ('green-tinkerbell', 'M', 1, 3), ('green-tinkerbell', 'L', 1, 4),
  ('green-tinkerbell',  'XL', 1, 5), ('green-tinkerbell', '2XL', 1, 6), ('green-tinkerbell', '3XL', 1, 7),
  ('black-silk',        'S', 1, 2), ('black-silk', 'M', 1, 3), ('black-silk', 'L', 1, 4), ('black-silk', 'XL', 1, 5),
  ('white-lace-warmer', 'S', 1, 2), ('white-lace-warmer', 'M', 1, 3), ('white-lace-warmer', 'L', 1, 4), ('white-lace-warmer', 'XL', 1, 5),
  ('cinderella',        'S', 1, 2), ('cinderella', 'M', 1, 3), ('cinderella', 'L', 1, 4),
  ('pink-prom',         'XS', 1, 1), ('pink-prom', 'S', 1, 2), ('pink-prom', 'M', 1, 3), ('pink-prom', 'L', 1, 4), ('pink-prom', 'XL', 1, 5),
  ('black-velvet',      'XS', 1, 1), ('black-velvet', 'S', 1, 2), ('black-velvet', 'M', 1, 3), ('black-velvet', 'L', 1, 4), ('black-velvet', 'XL', 1, 5)
on conflict (dress_id, size) do nothing;

-- 한 번만 실행되는 변경 기록
create table if not exists app_migrations (
  id          text primary key,
  applied_at  timestamptz not null default now()
);

-- 2026-10-19: 드레스 6벌로 정리 (레드벨벳·레드리본 숨김, 신데렐라 추가, 가격·사진·사이즈 갱신). 이미 배포된 DB에 한 번만 적용
do $$
begin
  if not exists (select 1 from app_migrations where id = '2026-10-19-dresses-v3') then
    -- 빠진 드레스는 숨김 (지난 예약 기록이 남아 있을 수 있어서 지우지 않아요)
    update dresses set active = false where id in ('red-velvet', 'red-ribbon', 'black-modern', 'white-tweed');

    insert into dresses (id, name, name_en, name_zh, price, price_usd, image, model_size, model_spec, sort, active) values
      ('green-tinkerbell',  '그린팅커벨',       'Green Tinker Bell', '绿色小叮当',   27000, null, '/images/dresses/green-tinkerbell-1.jpg',  null, null, 1, true),
      ('black-silk',        '블랙실크',         'Black Silk',        '黑色丝绸',     27000, null, '/images/dresses/black-silk-1.jpg',        null, null, 2, true),
      ('white-lace-warmer', '화이트레이스워머', 'White Lace Warmer', '白色蕾丝袖套', 27000, null, '/images/dresses/white-lace-warmer-1.jpg', null, null, 3, true),
      ('cinderella',        '신데렐라',         'Cinderella',        '灰姑娘',       27000, null, '/images/dresses/cinderella-1.jpg',        null, null, 4, true),
      ('pink-prom',         '핑크프롬',         'Pink Prom',         '粉色舞会',     23000, null, '/images/dresses/pink-prom-1.jpg',         null, null, 5, true),
      ('black-velvet',      '블랙벨벳',         'Black Velvet',      '黑色丝绒',     23000, null, '/images/dresses/black-velvet-1.jpg',      null, null, 6, true)
    on conflict (id) do update set
      name = excluded.name, name_en = excluded.name_en, name_zh = excluded.name_zh,
      price = excluded.price, price_usd = excluded.price_usd, image = excluded.image,
      sort = excluded.sort, active = true;

    -- 사이즈: 사이즈표에 있는 전 사이즈 (이미 있는 사이즈의 수량은 그대로 두고 순서만 맞춰요)
    delete from dress_stock s
     using (values ('green-tinkerbell', array['XS','S','M','L','XL','2XL','3XL']),
                   ('black-silk',        array['S','M','L','XL']),
                   ('white-lace-warmer', array['S','M','L','XL']),
                   ('cinderella',        array['S','M','L']),
                   ('pink-prom',         array['XS','S','M','L','XL']),
                   ('black-velvet',      array['XS','S','M','L','XL'])) as keep(dress_id, sizes)
     where s.dress_id = keep.dress_id and not (s.size = any(keep.sizes));
    insert into dress_stock (dress_id, size, quantity, sort) values
      ('green-tinkerbell',  'XS', 1, 1), ('green-tinkerbell', 'S', 1, 2), ('green-tinkerbell', 'M', 1, 3), ('green-tinkerbell', 'L', 1, 4),
      ('green-tinkerbell',  'XL', 1, 5), ('green-tinkerbell', '2XL', 1, 6), ('green-tinkerbell', '3XL', 1, 7),
      ('black-silk',        'S', 1, 2), ('black-silk', 'M', 1, 3), ('black-silk', 'L', 1, 4), ('black-silk', 'XL', 1, 5),
      ('white-lace-warmer', 'S', 1, 2), ('white-lace-warmer', 'M', 1, 3), ('white-lace-warmer', 'L', 1, 4), ('white-lace-warmer', 'XL', 1, 5),
      ('cinderella',        'S', 1, 2), ('cinderella', 'M', 1, 3), ('cinderella', 'L', 1, 4),
      ('pink-prom',         'XS', 1, 1), ('pink-prom', 'S', 1, 2), ('pink-prom', 'M', 1, 3), ('pink-prom', 'L', 1, 4), ('pink-prom', 'XL', 1, 5),
      ('black-velvet',      'XS', 1, 1), ('black-velvet', 'S', 1, 2), ('black-velvet', 'M', 1, 3), ('black-velvet', 'L', 1, 4), ('black-velvet', 'XL', 1, 5)
    on conflict (dress_id, size) do update set sort = excluded.sort;

    insert into app_migrations (id) values ('2026-10-19-dresses-v3');
  end if;
end $$;
