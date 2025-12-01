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
    @track allHolidaysList = [];

    handleIdChange(event) {
        this.idNumber = event.target.value;
        this.showError = false;
        this.errorMessage = '';

        this.description = null;
        this.holidayDescription = null;
        this.allHolidaysList = [];
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
        return idNumber && idNumber.length === 13 && /^[0-9]+$/.test(idNumber);
    }

    searchHolidays() {
        this.description = null;
        this.holidayDescription = null;
        this.allHolidaysList = [];
        this.errorMessage = '';
        this.showError = false;
        this.message = '';
        this.isValidCheckDigit = true;

        if (!this.isValidIdNumber(this.idNumber)) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. Please enter a valid 13-digit ID number.';
            return;
        }

        const yearPrefix = this.idNumber.substring(0, 2) < 50 ? '20' : '19';
        const fullYear = yearPrefix + this.idNumber.substring(0, 2);

        const tempDate = new Date(fullYear, this.idNumber.substring(2, 4) - 1, this.idNumber.substring(4, 6));

        const idDay = tempDate.getDate().toString().padStart(2, '0');
        const idMonth = (tempDate.getMonth() + 1).toString().padStart(2, '0');

        this.fullDate = `${idDay}-${idMonth}-${fullYear}`;

        const genderCode = this.idNumber.substring(6, 10);
        this.gender = parseInt(genderCode) < 5000 ? 'Female' : 'Male';

        this.citizenship = parseInt(this.idNumber.substring(10, 11)) === 0 ? 'Yes' : 'No';

        this.description =
            `Name: ${this.name}\n` +
            `ID Number: ${this.idNumber}\n` +
            `Birth Date: ${this.fullDate}\n` +
            `Gender: ${this.gender}\n` +
            `Citizen: ${this.citizenship}`;

        checkHolidays({ idNumber: this.idNumber })
            .then(result => {
                this.message = result.message || '';

                if (result.message && result.message.toLowerCase().includes('invalid')) {
                    this.showError = true;
                    this.errorMessage = result.message;
                    this.holidayDescription = null;
                    this.allHolidaysList = [];
                    this.description = null;
                    this.year = '';
                    return;
                }

                this.showError = false;

                this.holidayDescription =
                    result.description || 'No public holidays found for your birthday.';

                this.allHolidaysList =
                    result.allHolidays ? result.allHolidays.split('\n') : [];

                this.year = result.year;
            })
            .catch(error => {
                console.error('Apex Error:', error);
                this.showError = true;
                this.errorMessage = 'A server error occurred.';
                this.holidayDescription = null;
                this.allHolidaysList = [];
                this.description = null;
            });
    }
}
