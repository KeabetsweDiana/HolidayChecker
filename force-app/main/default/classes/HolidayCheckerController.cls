public with sharing class HolidayCheckerController {

    @AuraEnabled
    public static HolidaysResponse checkHolidays(String idNumber) {
        HolidaysResponse response = new HolidaysResponse();

        // 🔒 FULL SA ID VALIDATION
        if (!isValidSouthAfricanId(idNumber)) {
            response.setMessage('Invalid ID number. Please enter a valid South African ID.');
            return response;
        }

        // ✔ Extract year from SA ID
        String yy = idNumber.substring(0, 2);
        Integer year = getFullYearFromYY(yy);
        response.setYear(String.valueOf(year));

        // 2️⃣ Build Calendarific API URL
        String apiKey = '24c5e86734eb44dc4a962826324a5546e74dc42f';
        String country = 'ZA';

        String url =
            'https://calendarific.com/api/v2/holidays?'
            + 'api_key=' + apiKey
            + '&country=' + country
            + '&year=' + year;

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
            Map<String, Object> root = (Map<String, Object>) JSON.deserializeUntyped(apiResponse.getBody());
            Map<String, Object> responseMap = (Map<String, Object>) root.get('response');

            List<Object> holidays = (List<Object>) responseMap.get('holidays');

            if (holidays == null || holidays.isEmpty()) {
                response.setMessage('No public holidays found.');
                return response;
            }

            List<String> holidayNames = new List<String>();

            for (Object h : holidays) {
                Map<String, Object> holidayData = (Map<String, Object>) h;
                holidayNames.add((String) holidayData.get('name'));
            }

            response.setMessage('Public holidays retrieved successfully.');
            response.setDescription(String.join(holidayNames, ', '));

        } else {
            response.setMessage('Error calling Calendarific: ' + apiResponse.getStatus());
        }

        return response;
    }

    // Converts SA ID YY → full year YYYY
    private static Integer getFullYearFromYY(String yy) {
        Integer year = Integer.valueOf(yy);

        // SA ID logic: 00–24 = 2000–2024, else 1925–1999
        if (year <= 24) return 2000 + year;
        return 1900 + year;
    }

    // 🔒 FULL SOUTH AFRICAN ID VALIDATOR
    private static Boolean isValidSouthAfricanId(String id) {
        if (String.isBlank(id) || id.length() != 13) 
            return false;

        // Validate date (YYMMDD)
        String birth = id.substring(0, 6);
        if (!isValidDate(birth))
            return false;

        // Luhn check
        return luhnCheck(id);
    }

    // DATE VALIDATION FOR YYMMDD
    private static Boolean isValidDate(String birth) {
        try {
            Date d = Date.valueOf('20' + birth.substring(0, 2) 
                + '-' + birth.substring(2, 4) 
                + '-' + birth.substring(4, 6));
        } catch (Exception e) {
            return false;
        }
        return true;
    }

   private static Boolean luhnCheck(String id) {
    Integer sum = 0;
    Boolean alt = false;

    for (Integer i = id.length() - 1; i >= 0; i--) {
        Integer digit = Integer.valueOf(id.substring(i, i + 1));

        if (alt) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        alt = !alt;
    }

    return (Math.mod(sum, 10) == 0);
}


    public class HolidaysResponse {
        @AuraEnabled public String message { get; private set; }
        @AuraEnabled public String year { get; private set; }
        @AuraEnabled public String description { get; private set; }

        public void setMessage(String message)   { this.message = message; }
        public void setYear(String year)         { this.year = year; }
        public void setDescription(String descriptionValue) { this.description = descriptionValue; }
    }
}
