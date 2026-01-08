-- Seed pub-specific challenges (only for select pubs)
-- Pubs without challenges can still be captured, just without bonus points
insert into challenges (type, pub_id, description)
select 
  'pub' as type,
  id as pub_id,
  case 
    when name = 'The Federal Hotel' then 'Gambling challenge: One member of your team must win a bet on the TAB machine with 20 to 1 odds or higher. (ie. turn $1 into $20)'
    when name = 'Fremantle Buffalo Club' then 'Pool challenge: One of your team members must beat a Buffalo Club member at a game of pool.'
    when name = 'The National Hotel' then 'Where`s Wally challenge: Your team must find the building featured in the attached photo.'
    when name = 'Gage Roads Freo Brewery' then 'Ring challenge: Two members of your team must play the ring game in the courtyard and get both rings on the hook.'
    when name = 'Bathers Beach House' then 'Water challenge: One member of your team must fully submerge themselves in the ocean.'
    when name = 'Archie Brothers Fremantle' then 'Dragon challenge: One member of your team must score over 9600 points on the Dragon Punch machine.'
    when name = 'Mons O`Shea' then 'Split the G challenge: One member of your team must split the G on a pint of Guinness.'
    when name = 'Calamity`s Rod Freo' then 'Pour your own challenge: One member of your team must convince the bartender to let them pour their own drink from behind the bar.'
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

