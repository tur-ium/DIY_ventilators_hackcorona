WITH target_country AS
	  (SELECT capital_latitude  AS target_latitude,
              capital_longitude AS target_longitude
       FROM   app_db.geo.capitals
       WHERE  country_name = 'France')
SELECT   capital_name,
         country_name,
         Calculate_distance((SELECT target_latitude FROM target_country),
         					(SELECT target_longitude FROM target_country),
         					capital_latitude,
         					capital_longitude,
         					'M') AS distance
FROM     app_db.geo.capitals
ORDER BY distance limit 10;