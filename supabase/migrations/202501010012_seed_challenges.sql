-- Seed pub-specific challenges (only for select pubs)
-- Pubs without challenges can still be captured, just without bonus points
insert into challenges (type, pub_id, description)
select 
  'pub' as type,
  id as pub_id,
  case 
    when name = 'The Federal Hotel' then 'Gambling challenge'
    when name = 'Fremantle Buffalo Club' then 'Pool challenge'
    when name = 'The National Hotel' then 'Where`s Wally challenge'
    when name = 'Gage Roads Freo Brewery' then 'Ring challenge'
    when name = 'Bathers Beach House' then 'Swimming challenge'
    when name = 'B Lucky and Sons' then 'Dragon punch 9600 challenge'
    when name = 'Mons O`Shea' then 'Split the G challenge'
    when name = 'Calamity`s Rod Freo' then 'Pour your own drink challenge'
  end as description
from pubs
where name in (
  'The Federal Hotel',
  'Fremantle Buffalo Club',
  'The National Hotel',
  'Gage Roads Freo Brewery',
  'Bathers Beach House',
  'B Lucky and Sons',
  'Mons O`Shea',
  'Calamity`s Rod Freo'
);

-- Seed global challenges (bonus points, can only be completed once total)
insert into challenges (type, pub_id, description) values
  ('global', null, 'Get a photo with someone named Reuben'),
  ('global', null, 'Get a photo with someone named Gaynor');

