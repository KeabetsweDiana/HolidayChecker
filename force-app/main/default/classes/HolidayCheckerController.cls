public with sharing class HolidayCheckerController {

    @AuraEnabled
    public static HolidaysResponse checkHolidays(String idNumber) {

        HolidaysResponse response = new HolidaysResponse();

        
        if (String.isBlank(idNumber) || idNumber.length() < 13) {
            response.setMessage('Invalid ID number.');
            return response;
        }

        // Extract birth info
        String yy = idNumber.substring(0, 2);
        Integer year = getFullYearFromYY(yy);
        Integer birthMonth = Integer.valueOf(idNumber.substring(2, 4));
        Integer birthDay   = Integer.valueOf(idNumber.substring(4, 6));
        Date birthDate = Date.newInstance(year, birthMonth, birthDay);
        String gender = Integer.valueOf(idNumber.substring(6, 10)) < 5000 ? 'Female' : 'Male';
        String citizen = Integer.valueOf(idNumber.substring(10, 11)) == 0 ? 'Yes' : 'No';

        

        response.setYear(String.valueOf(year));

        // API Endpoint
        String apiKey = '24c5e86734eb44dc4a962826324a5546e74dc42f';
        String country = 'ZA';

        String url =
            'https://calendarific.com/api/v2/holidays?' +
            'api_key=' + apiKey +
            '&country=' + country +
            '&year=' + year;

        // Call API
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

        
        if (apiResponse.getStatusCode() == 200) {

            Map<String, Object> root = 
                (Map<String, Object>) JSON.deserializeUntyped(apiResponse.getBody());
            Map<String, Object> responseMap = 
                (Map<String, Object>) root.get('response');

            List<Object> holidays = (List<Object>) responseMap.get('holidays');

            if (holidays == null || holidays.isEmpty()) {
                response.setMessage('No public holidays found.');
                return response;
            }

            
            List<String> birthdayHolidays = new List<String>();
            List<String> allYearHolidays = new List<String>();

            
            for (Object h : holidays) {

                Map<String, Object> holidayData = (Map<String, Object>) h;
                Map<String, Object> dateInfo =
                    (Map<String, Object>) holidayData.get('date');

                String isoDate = (String) dateInfo.get('iso');  // YYYY-MM-DD
                Date holidayDt = Date.valueOf(isoDate);

                String holidayName = (String) holidayData.get('name');

                
                allYearHolidays.add(holidayName + ' (' + isoDate + ')');

                
                if (holidayDt.month() == birthMonth && holidayDt.day() == birthDay) {
                    birthdayHolidays.add(holidayName);
                }
            }

            
            response.setAllHolidays(String.join(allYearHolidays, '\n'));

            
            if (!birthdayHolidays.isEmpty()) {
                response.setMessage('Public holidays on your birth date:');
                response.setDescription(String.join(birthdayHolidays, ', '));
            } else {
                response.setMessage('No holidays fall exactly on your birthday.');
                response.setDescription('None');
            }

        } else {
            response.setMessage('Error calling Calendarific: ' + apiResponse.getStatus());
        }

        return response;
    }

    private static Integer getFullYearFromYY(String yy) {
        Integer year = Integer.valueOf(yy);
        return (year <= 24) ? 2000 + year : 1900 + year;
    }


    public class HolidaysResponse {
        @AuraEnabled public String message { get; private set; }
        @AuraEnabled public String year { get; private set; }
        @AuraEnabled public String description { get; private set; }
        @AuraEnabled public String allHolidays { get; private set; }

        public void setMessage(String message) { this.message = message; }
        public void setYear(String year) { this.year = year; }
        public void setDescription(String descriptionValue) { this.description = descriptionValue; }
        public void setAllHolidays(String value) { this.allHolidays = value; }
    }
}
