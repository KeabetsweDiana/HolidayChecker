public with sharing class HolidayCheckerDB {

    public static void saveSearch(String idNumber, String name, Date birthDate, String gender, String citizen) {

        // Query existing record
        List<Holiday_Checker__c> records = [
            SELECT Id, Search_Count__c 
            FROM Holiday_Checker__c 
            WHERE Identity_Number__c = :idNumber
            LIMIT 1
        ];

        if (!records.isEmpty()) {
            // Update existing record
            Holiday_Checker__c existing = records[0];
            existing.Search_Count__c = (existing.Search_Count__c == null ? 1 : existing.Search_Count__c + 1);
            existing.Search_Date__c = System.now();
            update existing;
        } else {
            // Insert new record
            Holiday_Checker__c newRecord = new Holiday_Checker__c(
                Identity_Number__c = idNumber,
                Name = (name != null ? name : 'Holiday Checker'),
                Date_of_Birth__c = birthDate,
                Gender__c = gender,
                SA_Citizen__c = citizen,
                Search_Count__c = 1,
                Search_Date__c = System.now()
            );
            insert newRecord;
        }
    }
}
