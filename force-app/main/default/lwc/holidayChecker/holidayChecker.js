import { LightningElement, track } from 'lwc';
import checkHolidays from '@salesforce/apex/HolidayCheckerController.checkHolidays';

export default class PublicHoliday extends LightningElement {
    @track idNumber = '';
    @track name = '';
    @track description = '';
    @track message = '';
    @track showError = false;
    @track errorMessage = '';
    @track gender = '';
    @track citizenship = '';
    @track isValidCheckDigit = true;
    @track holidaysList = [];
    @track fullDate = '';
    @track holidayDescription = '';

    handleIdChange(event) {
        this.idNumber = event.target.value;
        this.showError = false;
        this.errorMessage = '';
    }

    handleNameChange(event) {
        this.name = event.target.value;
        this.showError = false;
        this.errorMessage = '';
    }

    get isSearchDisabled() {
        return !this.isValidIdNumber(this.idNumber);
    }

    isValidIdNumber(idNumber) {
        return idNumber && idNumber.length === 13;
    }

    searchHolidays() {
        // Validate ID Number
        if (!this.isValidIdNumber(this.idNumber)) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. Please enter a valid ID number.';
            return;
        }

        // CLEAR PREVIOUS SEARCH RESULTS
        this.description = '';
        this.errorMessage = '';
        this.holidayDescription = '';
        this.showError = false;

        // --- CALL APEX ---
        checkHolidays({ idNumber: this.idNumber })
            .then(result => {
                this.message = result.message;
                this.holidayDescription = result.description; // <<--- HOLIDAYS FROM API
                this.year = result.year;

                // If no holidays found
                if (!result.description) {
                    this.holidayDescription = 'No public holidays found.';
                }
            })
            .catch(error => {
                console.error(error);
                this.message = 'Error checking holidays.';
            });

        // ------------------------------------------
        // EXTRACT ID NUMBER DETAILS
        // ------------------------------------------

        // Build Date of Birth
        const tempDate = new Date(
            this.idNumber.substring(0, 2),
            this.idNumber.substring(2, 4) - 1,
            this.idNumber.substring(4, 6)
        );

        const idDate = tempDate.getDate();
        const idMonthNumber = tempDate.getMonth() + 1;
        const idYearFull = tempDate.getFullYear();
        this.fullDate = `${idDate}-${idMonthNumber}-${idYearFull}`;

        // Gender
        const genderCode = this.idNumber.substring(6, 10);
        this.gender = parseInt(genderCode) < 5000 ? 'Female' : 'Male';

        // Citizenship
        this.citizenship = parseInt(this.idNumber.substring(10, 11)) === 0 ? 'Yes' : 'No';

        // Luhn Check
        let checkSum = 0;
        let multiplier = 1;

        for (let i = 0; i < 13; i++) {
            let tempTotal = parseInt(this.idNumber.charAt(i)) * multiplier;
            if (tempTotal > 9) {
                tempTotal = (tempTotal % 10) + 1; 
            }
            checkSum += tempTotal;
            multiplier = multiplier === 1 ? 2 : 1;
        }

        this.isValidCheckDigit = (checkSum % 10 === 0);

        if (!this.isValidCheckDigit) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. Please enter a valid ID number.';
            return;
        }

        // ------------------------------------------
        // BUILD USER DETAILS DESCRIPTION
        // ------------------------------------------
        this.description =
            `Name: ${this.name}\n` +
            `South African ID Number: ${this.idNumber}\n` +
            `Birth Date: ${this.fullDate}\n` +
            `Gender: ${this.gender}\n` +
            `SA Citizen: ${this.citizenship}\n`;
    }
}
