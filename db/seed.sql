-- 드레스 데이터. 처음 한 번만 들어가고, 그 뒤로는 관리자 화면 > 드레스 관리에서 바꾼 값이 유지돼요.
-- 사이즈별 수량은 1벌씩으로 넣어뒀어요 (관리자 화면에서 바꿀 수 있어요).
-- 드레스 선택 화면은 낮은 가격순으로 보여요 (같은 가격이면 sort 순서).

insert into dresses (id, name, name_en, name_zh, price, price_usd, image, model_size, model_spec, sort) values
  ('red-velvet',        '레드벨벳',         'Red Velvet',        '红色丝绒',   22000, null, '/images/dresses/red-velvet.jpg',        null, null, 1),
  ('black-velvet',      '블랙벨벳',         'Black Velvet',      '黑色丝绒',   22000, null, '/images/dresses/black-velvet.jpg',      null, null, 2),
  ('pink-prom',         '핑크프롬',         'Pink Prom',         '粉色舞会',   22000, null, '/images/dresses/pink-prom.jpg',         null, null, 3),
  ('red-ribbon',        '레드리본',         'Red Ribbon',        '红色蝴蝶结', 25000, null, '/images/dresses/red-ribbon.jpg',        null, null, 4),
  ('green-tinkerbell',  '그린팅커벨',       'Green Tinker Bell', '绿色小叮当', 28500, null, '/images/dresses/green-tinkerbell.jpg',  null, null, 5),
  ('black-silk',        '블랙실크',         'Black Silk',        '黑色丝绸',   28500, null, '/images/dresses/black-silk.jpg',        null, null, 6),
  ('white-lace-warmer', '화이트레이스워머', 'White Lace Warmer', '白色蕾丝袖套', 28500, null, '/images/dresses/white-lace-warmer.jpg', null, null, 7)
on conflict (id) do nothing;

insert into dress_stock (dress_id, size, quantity, sort) values
  ('red-velvet',        'S', 1, 1), ('red-velvet',        'M', 1, 2), ('red-velvet',        'L', 1, 3),
  ('black-velvet',      'S', 1, 1), ('black-velvet',      'M', 1, 2), ('black-velvet',      'L', 1, 3),
  ('pink-prom',         'S', 1, 1), ('pink-prom',         'M', 1, 2), ('pink-prom',         'L', 1, 3),
  ('red-ribbon',        'S', 1, 1), ('red-ribbon',        'M', 1, 2), ('red-ribbon',        'L', 1, 3), ('red-ribbon', 'XL', 1, 4),
  ('green-tinkerbell',  'M', 1, 2), ('green-tinkerbell',  'L', 1, 3), ('green-tinkerbell',  'XL', 1, 4),
  ('black-silk',        'S', 1, 1), ('black-silk',        'M', 1, 2), ('black-silk',        'L', 1, 3),
  ('white-lace-warmer', 'S', 1, 1), ('white-lace-warmer', 'M', 1, 2), ('white-lace-warmer', 'L', 1, 3)
on conflict (dress_id, size) do nothing;

-- 한 번만 실행되는 변경 기록
create table if not exists app_migrations (
  id          text primary key,
  applied_at  timestamptz not null default now()
);

-- 2026-10-10: 임시 드레스 3벌 → 실제 드레스 7벌 (이미 배포된 DB에 한 번만 적용)
do $$
begin
  if not exists (select 1 from app_migrations where id = '2026-10-10-dresses-v2') then
    -- 임시 드레스는 숨김 (지난 예약 기록이 남아 있을 수 있어서 지우지 않아요)
    update dresses set active = false where id in ('black-modern', 'white-tweed');
    -- 그린팅커벨은 원래 있던 드레스라 가격·이름·사이즈를 새 값으로
    update dresses
       set name = '그린팅커벨', name_en = 'Green Tinker Bell', name_zh = '绿色小叮当',
           price = 28500, price_usd = null, image = '/images/dresses/green-tinkerbell.jpg',
           model_size = null, model_spec = null, sort = 5, active = true
     where id = 'green-tinkerbell';
    delete from dress_stock where dress_id = 'green-tinkerbell' and size not in ('M', 'L', 'XL');
    insert into dress_stock (dress_id, size, quantity, sort) values
      ('green-tinkerbell', 'M', 1, 2), ('green-tinkerbell', 'L', 1, 3), ('green-tinkerbell', 'XL', 1, 4)
    on conflict (dress_id, size) do update set sort = excluded.sort;
    insert into app_migrations (id) values ('2026-10-10-dresses-v2');
  end if;
end $$;
