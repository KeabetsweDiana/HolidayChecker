public with sharing class HolidayCheckerController {

    // MAIN METHOD CALLED FROM LWC
    @AuraEnabled
    public static HolidaysResponse checkHolidays(String idNumber) {

        HolidaysResponse response = new HolidaysResponse();

        // 🔍 1. BASIC VALIDATION
        if (String.isBlank(idNumber) || idNumber.length() != 13) {
            response.setMessage('Invalid ID number. Please enter a valid South African ID.');
            return response;
        }

        // 2️⃣ Extract YYYY, MM, DD from SA ID Number
        String yy = idNumber.substring(0, 2);
        Integer year = getFullYearFromYY(yy);

        Integer birthMonth = Integer.valueOf(idNumber.substring(2, 4));
        Integer birthDay   = Integer.valueOf(idNumber.substring(4, 6));

        response.setYear(String.valueOf(year));

        // 3️⃣ Calendarific API URL
        String apiKey = '24c5e86734eb44dc4a962826324a5546e74dc42f';
        String country = 'ZA';

        String url =
            'https://calendarific.com/api/v2/holidays?' +
            'api_key=' + apiKey +
            '&country=' + country +
            '&year=' + year;

        // 🌍 Call the API
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setMethod('GET');

        Http http = new Http();
        HttpResponse apiResponse;

        try {
            apiResponse = http.send(req);
        } catch (Exception e) {
            response.setMessage('API call failed: ' + e.getMessage());
            return response;
        }

        // 4️⃣ Parse JSON
        if (apiResponse.getStatusCode() == 200) {

            Map<String, Object> root = (Map<String, Object>) JSON.deserializeUntyped(apiResponse.getBody());
            Map<String, Object> responseMap = (Map<String, Object>) root.get('response');
            List<Object> holidays = (List<Object>) responseMap.get('holidays');

            if (holidays == null || holidays.isEmpty()) {
                response.setMessage('No public holidays found for that year.');
                return response;
            }

            List<String> birthdayHolidays = new List<String>();
            List<String> allYearHolidays  = new List<String>();

            for (Object h : holidays) {
                Map<String, Object> holidayData = (Map<String, Object>) h;
                Map<String, Object> dateInfo    = (Map<String, Object>) holidayData.get('date');

                // ISO FORMAT yyyy-mm-dd
                String isoDate = (String) dateInfo.get('iso');

                // Fix: Convert ISO date properly
                Date holidayDt = Date.valueOf(isoDate.substring(0, 10));

                String holidayName = (String) holidayData.get('name');

                // Add to full-year holidays
                allYearHolidays.add(holidayName + ' (' + isoDate + ')');

                // Check if holiday is ON birthday
                if (holidayDt.month() == birthMonth && holidayDt.day() == birthDay) {
                    birthdayHolidays.add(holidayName);
                }
            }

            // Return ALL holidays
            response.setAllHolidays(String.join(allYearHolidays, '\n'));

            // Return birthday-specific holidays
            if (!birthdayHolidays.isEmpty()) {
                response.setDescription(String.join(birthdayHolidays, '; '));
                response.setMessage('Public holidays on your birthdate:');
            } else {
                response.setDescription('None');
                response.setMessage('No holidays fall exactly on your birthday.');
            }
        }
        else {
            response.setMessage('Error calling Calendarific: ' + apiResponse.getStatus());
        }

        return response;
    }

    


    /*********************************
     *   YY → YYYY conversion
     *********************************/
    private static Integer getFullYearFromYY(String yy) {
        Integer year = Integer.valueOf(yy);
        return (year <= 24) ? 2000 + year : 1900 + year;
    }



    /*********************************
     *   RESPONSE CLASS
     *********************************/
    public class HolidaysResponse {

        @AuraEnabled public String message { get; private set; }
        @AuraEnabled public String year { get; private set; }
        @AuraEnabled public String description { get; private set; }
        @AuraEnabled public String allHolidays { get; private set; }

        public void setAllHolidays(String value) { this.allHolidays = value; }
        public void setMessage(String value)     { this.message = value; }
        public void setYear(String value)        { this.year = value; }
        public void setDescription(String value) { this.description = value; }
    }
}
