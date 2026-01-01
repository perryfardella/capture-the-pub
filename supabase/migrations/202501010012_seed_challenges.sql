-- Seed pub-specific challenges (one per pub)
-- Each pub gets a unique challenge that can lock the pub when completed
insert into challenges (type, pub_id, description)
select 
  'pub' as type,
  id as pub_id,
  case 
    when name = 'The Crown & Anchor' then 'Down a pint while standing on one leg'
    when name = 'The Red Lion' then 'Sing the national anthem at full volume'
    when name = 'The King''s Head' then 'Do 10 push-ups on the bar counter'
    when name = 'The White Horse' then 'Arm wrestle the bartender (or a teammate)'
    when name = 'The Old Bell' then 'Recite a poem about the groom while holding a drink'
    when name = 'The Rose & Crown' then 'Dance for 30 seconds without spilling your drink'
    when name = 'The Black Swan' then 'Take a group photo with everyone doing a silly pose'
    when name = 'The Golden Fleece' then 'Complete a pub quiz round (get 3+ questions right)'
    when name = 'The Three Tuns' then 'Do a handstand against the wall (or attempt!)'
    when name = 'The Fox & Hounds' then 'Tell your best joke and get 3+ people to laugh'
    else 'Complete a fun challenge at ' || name
  end as description
from pubs;

-- Seed global challenges (bonus points, can only be completed once total)
insert into challenges (type, pub_id, description) values
  ('global', null, 'Get a photo with the groom doing a shot'),
  ('global', null, 'Complete a conga line through the entire pub crawl route'),
  ('global', null, 'Get a selfie with a stranger who wishes the groom well'),
  ('global', null, 'Record a group video message for the groom''s future self'),
  ('global', null, 'Successfully order a round of drinks in a foreign language (or attempt!)');

