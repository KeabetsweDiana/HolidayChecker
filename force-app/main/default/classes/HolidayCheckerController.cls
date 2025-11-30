public with sharing class HolidayCheckerController {

    // MAIN METHOD CALLED FROM LWC
    @AuraEnabled
    public static HolidaysResponse checkHolidays(String idNumber) {

        HolidaysResponse response = new HolidaysResponse();

        // 1️⃣ Extract YYYY, MM, DD from SA ID Number
        if (String.isBlank(idNumber) || idNumber.length() < 6) {
            response.setMessage('Invalid ID number.');
            return response;
        }

        // SA ID Number: YYMMDD
        String yy = idNumber.substring(0, 2);
        Integer year = getFullYearFromYY(yy);

        Integer birthMonth = Integer.valueOf(idNumber.substring(2, 4));
        Integer birthDay   = Integer.valueOf(idNumber.substring(4, 6));

        response.setYear(String.valueOf(year));

        // 2️⃣ Build Calendarific API URL
        String apiKey = '24c5e86734eb44dc4a962826324a5546e74dc42f';
        String country = 'ZA';

        String url =
            'https://calendarific.com/api/v2/holidays?'
            + 'api_key=' + apiKey
            + '&country=' + country
            + '&year=' + year;

        // 3️⃣ CALL THE API
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

        // 4️⃣ Parse JSON response
        if (apiResponse.getStatusCode() == 200) {

            Map<String, Object> root = (Map<String, Object>) JSON.deserializeUntyped(apiResponse.getBody());
            Map<String, Object> responseMap = (Map<String, Object>) root.get('response');

            List<Object> holidays = (List<Object>) responseMap.get('holidays');

            if (holidays == null || holidays.isEmpty()) {
                response.setMessage('No public holidays found.');
                return response;
            }

            List<String> holidayNames = new List<String>();

            // 🎯 Only include holidays that match the user's birthday
            for (Object h : holidays) {
                Map<String, Object> holidayData = (Map<String, Object>) h;
                Map<String, Object> dateInfo = (Map<String, Object>) holidayData.get('date');

                // Parse ISO date string to avoid reserved keywords
                String isoDate = (String) dateInfo.get('iso'); // e.g. "2025-03-21"
                Date holidayDt = Date.valueOf(isoDate);

                if (holidayDt.month() == birthMonth && holidayDt.day() == birthDay) {
                    holidayNames.add((String) holidayData.get('name'));
                }
            }

            if (holidayNames.isEmpty()) {
                response.setMessage('There are no public holidays on your birthday.');
            } else {
                response.setMessage('Public holidays on your birthday:');
                response.setDescription(String.join(holidayNames, ', '));
            }

        } else {
            response.setMessage('Error calling Calendarific: ' + apiResponse.getStatus());
        }

        return response;
    }

    // Converts SA ID YY → full year YYYY
    private static Integer getFullYearFromYY(String yy) {
        Integer year = Integer.valueOf(yy);

        // SA ID logic: 00–24 = 2000–2024, else 1925–1999
        return (year <= 24) ? 2000 + year : 1900 + year;
    }

    // ❇ RESPONSE CLASS — FIXED
    public class HolidaysResponse {

        @AuraEnabled public String message { get; private set; }
        @AuraEnabled public String year { get; private set; }
        @AuraEnabled public String description { get; private set; }

        public void setMessage(String message)   { this.message = message; }
        public void setYear(String year)         { this.year = year; }
        public void setDescription(String descriptionValue) {
            this.description = descriptionValue;
        }
    }
}
