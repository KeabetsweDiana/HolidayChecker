import { LightningElement, track } from 'lwc';
import checkHolidays from '@salesforce/apex/HolidayCheckerController.checkHolidays';

export default class PublicHoliday extends LightningElement {
    @track idNumber = '';
    @track name = '';
    @track description = null;
    @track message = '';
    @track showError = false;
    @track errorMessage = '';
    @track gender = '';
    @track citizenship = '';
    @track isValidCheckDigit = true;
    @track holidaysList = [];
    @track fullDate = '';
    @track holidayDescription = null;
    @track year = '';

    // ------------------------------------------------------
    // INPUT HANDLERS
    // ------------------------------------------------------
    handleIdChange(event) {
        this.idNumber = event.target.value;
        this.showError = false;
        this.errorMessage = '';

        // CLEAR previous results
        this.description = null;
        this.holidayDescription = null;
    }

    handleNameChange(event) {
        this.name = event.target.value;
        this.showError = false;
        this.errorMessage = '';
    }

    // ------------------------------------------------------
    // SEARCH BUTTON ENABLE/DISABLE
    // ------------------------------------------------------
    get isSearchDisabled() {
        return !this.isValidIdNumber(this.idNumber);
    }

    isValidIdNumber(idNumber) {
        return idNumber && idNumber.length === 13 && /^[0-9]+$/.test(idNumber);
    }

    // ------------------------------------------------------
    // MAIN SEARCH LOGIC
    // ------------------------------------------------------
    searchHolidays() {
        // Always clear old results
        this.description = null;
        this.holidayDescription = null;
        this.errorMessage = '';
        this.showError = false;
        this.message = '';
        this.isValidCheckDigit = true;

        // ------------------------------------------------------
        // 1. BASIC LENGTH VALIDATION
        // ------------------------------------------------------
        if (!this.isValidIdNumber(this.idNumber)) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. Please enter a valid 13-digit ID number.';
            return;
        }

        // ------------------------------------------------------
        // 2. PARSE BIRTH DATE (SA ID format)
        // ------------------------------------------------------
        const yearPrefix = this.idNumber.substring(0, 2) < 50 ? '20' : '19';
        const fullYear = yearPrefix + this.idNumber.substring(0, 2);

        const tempDate = new Date(
            fullYear,
            this.idNumber.substring(2, 4) - 1,
            this.idNumber.substring(4, 6)
        );

        const idDay = tempDate.getDate().toString().padStart(2, '0');
        const idMonth = (tempDate.getMonth() + 1).toString().padStart(2, '0');

        this.fullDate = `${idDay}-${idMonth}-${fullYear}`;

        // ------------------------------------------------------
        // 3. GENDER (0000-4999 Female, 5000-9999 Male)
        // ------------------------------------------------------
        const genderCode = this.idNumber.substring(6, 10);
        this.gender = parseInt(genderCode) < 5000 ? 'Female' : 'Male';

        // ------------------------------------------------------
        // 4. CITIZENSHIP (0 = SA citizen)
        // ------------------------------------------------------
        this.citizenship =
            parseInt(this.idNumber.substring(10, 11)) === 0 ? 'Yes' : 'No';

        // ------------------------------------------------------
        // 5. LUHN CHECK (VALIDATES FULL ID NUMBER)
        // ------------------------------------------------------
        let sum = 0;
        let multiplier = 2;

        for (let i = 11; i >= 0; i--) {
            let digit = parseInt(this.idNumber.charAt(i));
            let total = digit * multiplier;

            if (total > 9) {
                total = (total % 10) + 1;
            }

            sum += total;
            multiplier = multiplier === 1 ? 2 : 1;
        }

        sum += parseInt(this.idNumber.charAt(12));
        this.isValidCheckDigit = (sum % 10 === 0);

        if (!this.isValidCheckDigit) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. The check digit is incorrect.';
            this.description = null;
            this.holidayDescription = null;
            return;
        }

        // ------------------------------------------------------
        // 6. VALID ID → BUILD USER DESCRIPTION
        // ------------------------------------------------------
        this.description =
            `Name: ${this.name}\n` +
            `ID Number: ${this.idNumber}\n` +
            `Birth Date: ${this.fullDate}\n` +
            `Gender: ${this.gender}\n` +
            `Citizen: ${this.citizenship}`;

        // ------------------------------------------------------
        // 7. CALL APEX TO GET HOLIDAYS
        // ------------------------------------------------------
        checkHolidays({ idNumber: this.idNumber })
    .then(result => {
        this.message = result.message || '';

        // ❗ If Apex says INVALID ID → show error & STOP
        if (result.message && result.message.toLowerCase().includes('invalid')) {
            this.showError = true;
            this.errorMessage = result.message;
            this.holidayDescription = null;
            this.description = null;
            this.year = '';
            return; // 🚀 VERY IMPORTANT
        }

        // No error → build holiday display
        this.showError = false;

        if (result.description && result.description.length > 0) {
            this.holidayDescription = result.description;
        } else {
            this.holidayDescription = 'No public holidays found for this year.';
        }

        this.year = result.year;
    })
    .catch(error => {
        console.error('Apex Error:', error);
        this.showError = true;
        this.errorMessage = 'A server error occurred.';
        this.description = null;
        this.holidayDescription = null;
    });

    }
}
