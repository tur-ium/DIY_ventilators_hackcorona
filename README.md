# DIY_ventilators_hackcorona

This repository contains all the code for the Hack Corona hackaton, with the objective of helping reducing the impact of the COVID-19 in society.

The objective  was to develop a chatbox to help engineers that want to build a DIY ventilator by giving instructions, list components, and components availability information. Ventilators are a key piece of emergency medical equipment which is needed in great quantities in this crisis. Time is everything! Huge limitations in terms of information on designs and materials. We need to cut down the time that an engineer needs to start building. In their quest for knowledge they are also putting additional stress on scarce expert.


In order to archive this objective, we created a bot to help the engineers get the maximum amount of data with the minimum time. To feed the bot with data, we scrap different websites for the different components of the ventilators and store that data inside a data werehouse.

The code that can be found at this repository follow this structure:

-SQL = SQL code used to create the schema of the data werehouse and other functions
-scraper = The code of the scraper used to adquire the data
-coro-sqs-moprocessor = Kernel code of the telegram bot.


