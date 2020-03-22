with target_country as (
select
	capital_latitude as target_latitude,
	capital_longitude as target_longitude
from
	capitals
where
	country_name = 'France')
select
	capital_name,
	country_name,
	calculate_distance((
	select
		target_latitude
	from
		target_country),
	(
	select
		target_longitude
	from
		target_country),
	capital_latitude,
	capital_longitude,
	'M') as distance
from
	capitals
order by
	distance
limit 10;