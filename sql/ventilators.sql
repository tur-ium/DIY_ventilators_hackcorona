CREATE TABLE component(
   component_name_raw varchar(50) PRIMARY KEY,
   component_name VARCHAR (50) UNIQUE NOT NULL,
   quantity VARCHAR (50),
   diy_ventilator_name VARCHAR (50) not NULL,
   distributor_name VARCHAR(50) NOT NULL,
   inventory numeric,
   region varchar(50),
   inventory_date TIMESTAMP,
   lead_time timestamp,
   price numeric,
   link varchar(250)
)

create table ventilator(
  diy_ventilator_name varchar(50) primary key,
  instructions varchar(250)
)

ALTER TABLE component 
ADD CONSTRAINT component_fk FOREIGN KEY (diy_ventilator_name) REFERENCES ventilator (diy_ventilator_name);
