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

        
        if (this.idNumber.length === 0) {
            this.showError = false;
            this.errorMessage = '';
            return;
        }

        if (!/^\d+$/.test(this.idNumber)) {
            this.showError = true;
            this.errorMessage = 'ID must contain only digits.';
            return;
        }

        if (this.idNumber.length < 13) {
            this.showError = true;
            this.errorMessage = 'ID must be 13 digits long.';
            return;
        }

        
        if (this.idNumber.length === 13) {
            const validationError = this.getValidationError(this.idNumber);
            if (validationError) {
                this.showError = true;
                this.errorMessage = validationError;
                return;
            }
        }

        
        this.showError = false;
        this.errorMessage = '';
    }

    handleNameChange(event) {
        this.name = event.target.value;
        this.showError = false;
        this.errorMessage = '';
    }

    resetMessages() {
        this.showError = false;
        this.errorMessage = '';
        this.description = null;
        this.holidayDescription = null;
        this.allHolidaysList = [];
        this.message = '';
        this.isValidCheckDigit = true;
    }

    
    getValidationError(idNumber) {
        const yy = parseInt(idNumber.substring(0, 2), 10);
        const mm = parseInt(idNumber.substring(2, 4), 10);
        const dd = parseInt(idNumber.substring(4, 6), 10);
        
        
        if (mm < 1 || mm > 12) {
            return 'Invalid birth month. Month must be between 01 and 12.';
        }
        if (dd < 1 || dd > 31) {
            return 'Invalid birth day. Day must be between 01 and 31.';
        }

        
        const genderCode = parseInt(idNumber.substring(6, 10), 10);
        if (genderCode < 0 || genderCode > 9999) {
            return 'Invalid gender code. Must be between 0000 and 9999.';
        }

        
        const citizenshipDigit = parseInt(idNumber.charAt(10), 10);
        if (citizenshipDigit !== 0 && citizenshipDigit !== 1) {
            return 'Invalid citizenship digit. Must be 0 (SA citizen) or 1 (permanent resident).';
        }

        
        if (!this.isValidChecksum(idNumber)) {
            return 'Invalid checksum. The last digit does not match the ID number.';
        }

        return null; 
    }

    
    isValidChecksum(idNumber) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            let digit = parseInt(idNumber.charAt(i), 10);
            if (i % 2 === 0) {
                sum += digit;
            } else {
                let double = digit * 2;
                sum += Math.floor(double / 10) + (double % 10);
            }
        }
        let checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(idNumber.charAt(12), 10);
    }

    
    isValidIdNumber(idNumber) {
        if (!/^\d{13}$/.test(idNumber)) return false;
        return this.getValidationError(idNumber) === null;
    }

    searchHolidays() {
        this.resetMessages();

        if (!this.isValidIdNumber(this.idNumber)) {
            this.showError = true;
            this.errorMessage = 'Invalid ID number. Please enter a valid 13-digit SA ID.';
            return;
        }

        // Extract birth date
        const yearPrefix = this.idNumber.substring(0, 2) < 50 ? '20' : '19';
        const fullYear = parseInt(yearPrefix + this.idNumber.substring(0, 2));
        const tempDate = new Date(fullYear, this.idNumber.substring(2, 4) - 1, this.idNumber.substring(4, 6));
        const idDay = tempDate.getDate().toString().padStart(2, '0');
        const idMonth = (tempDate.getMonth() + 1).toString().padStart(2, '0');
        this.fullDate = `${idDay}-${idMonth}-${fullYear}`;

        // Gender & citizenship
        const genderCode = parseInt(this.idNumber.substring(6, 10), 10);
        this.gender = genderCode < 5000 ? 'Female' : 'Male';
        this.citizenship = parseInt(this.idNumber.substring(10, 11), 10) === 0 ? 'Yes' : 'No';

        
        this.description =
            `Name: ${this.name}\n` +
            `ID Number: ${this.idNumber}\n` +
            `Birth Date: ${this.fullDate}\n` +
            `Gender: ${this.gender}\n` +
            `Citizen: ${this.citizenship}`

        
        checkHolidays({ idNumber: this.idNumber, name: this.name })
            .then(result => {
                if (result.message && result.message.toLowerCase().includes('invalid')) {
                    this.showError = true;
                    this.errorMessage = result.message;
                    this.resetMessages();
                    return;
                }

                this.showError = false;
                this.holidayDescription = result.description || 'No public holidays found for your birthday.';
                this.allHolidaysList = result.allHolidays ? result.allHolidays.split('\n') : [];
                this.year = result.year;
                this.message = result.message || '';
            })
            .catch(error => {
                console.error('Apex Error:', error);
                this.showError = true;
                this.errorMessage = 'A server error occurred.';
                this.resetMessages();
            });
    }
}