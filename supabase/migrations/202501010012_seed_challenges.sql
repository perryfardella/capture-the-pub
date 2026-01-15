-- Seed pub-specific challenges (only for select pubs)
-- Pubs without challenges can still be captured, just without bonus points
insert into challenges (type, pub_id, description)
select 
  'pub' as type,
  id as pub_id,
  case 
    when name = 'The Federal Hotel' then 'Kick Kick!: One member of your team must win a bet on the TAB machine with 20 to 1 odds or higher. (ie. turn $1 into $20)'
    when name = 'Fremantle Buffalo Club' then 'Buffalo Soldier: One of your team members must beat a Buffalo Club member at a game of pool.'
    when name = 'The National Hotel' then 'Where`s Wally: Your team must site the building featured in the attached image from the National Hotel and provide photographic evidence.'
    when name = 'Gage Roads Freo Brewery' then 'Two Rings, One Pole: Two different members of your team must play the ring game in the courtyard and each get a ring on the hook.'
    when name = 'Bathers Beach House' then 'The Harold Holt: One member of your team must fully submerge themselves in the ocean.'
    when name = 'Archie Brothers Fremantle' then 'Donkey Punch: One member of your team must score over 9600 points on the Dragon Punch machine.'
    when name = 'Mons O`Shea' then 'Find the G Spot: One member of your team must split the G on a pint of Guinness, just like in the attached image.'
    when name = 'Calamity`s Rod Freo' then 'I`m the Bartender Now: One member of your team must convince the bartender to let them pour their own drink from behind the bar.'
  end as description
from pubs
where name in (
  'The Federal Hotel',
  'Fremantle Buffalo Club',
  'The National Hotel',
  'Gage Roads Freo Brewery',
  'Bathers Beach House',
  'Archie Brothers Fremantle',
  'Mons O`Shea',
  'Calamity`s Rod Freo'
);

-- Seed global challenges (bonus points, can only be completed once total)
insert into challenges (type, pub_id, description) values
  ('global', null, 'Get a photo with someone named Reuben'),
  ('global', null, 'Get a photo with someone named Gaynor');

