To generate the file run the command from /PATH_WHERE_PROJECT_IS_CHECKOUT/scraper
1. mvn clean package
2. mvn exec:java -Dexec.mainClass="com.scraper.Scraper" -Dexec.args="PATH_WHERE_YOU_WANTED_CSV_FILE_TO_GENERATE"
for eg :- mvn exec:java -Dexec.mainClass="com.scraper.Scraper" -Dexec.args="/Users/vivmaheshwari/"