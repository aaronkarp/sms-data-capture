// Polyfill for Element.matches() and Element.closest()
if (!Element.prototype.matches) {
  Element.prototype.matchs =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest - function(s) {
    var el = this;

    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Create an empty list of validation errors
let errors = '';

// Gathering all forms on the page and making them an object/array
const forms = document.querySelectorAll('[id^="adv-form"]');

// Make a list of field types that will be ignored by validation
const ignoreTypes = ['hidden', 'submit', 'reset'];

// Gather telephone number field(s) in order to apply auto-formatting
const phoneFields = document.querySelectorAll('input[type="tel"]');

// loop through telephone number fields to add event listener
Array.prototype.slice.call(phoneFields).forEach(function (phoneField) {
  phoneField.setAttribute('maxlength','14');
  phoneField.addEventListener('input', phoneNumberFormatter);
});

// loop through forms
Array.prototype.slice.call(forms).forEach(function (form) {
  // add event listener to forms and listen for submit to get single form
  form.addEventListener('submit', (e) => {
    // Prevent submission in order to validate
    e.preventDefault();

    // dim submit button to indicate the form is being submitted
    const submitButton = form.querySelector('button[type="SUBMIT"]');
    submitButton.style.opacity = 0.5;

    // Clear error display area and error list
    const errorDisplay = form.querySelector('.advancedformbutton__errorDisplay');
    errorDisplay.innerHTML = '';
    errorDisplay.style.display = 'none';
    errors = '';

    // Gather all inputs and iterate over them to validate
    const fields = form.querySelectorAll('input');

    // Create variables for "Thanks" page, servlet endpoint, and the query to send to the servlet
    let successUrl,
        internalEndpoint
    let queryString = '';

    Array.prototype.slice.call(fields).forEach(function (field) {
      // Validate fields whose types are not found in the ignoreTypes array
      if (ignoreTypes.indexOf(field.type) === -1) {
        const valid = validate(field);

        // If the field passed validation, add its value to the query string based on its type/name
        // NOTE: This code is highly specialized and should be abstracted
        if (valid) {
          if(field.type === 'email') {
            const keyName = field.name;
            const email = field.value;
            queryString += `primaryKeyName=${keyName}&`;
            queryString += `primaryKeyValue=${email}&`;
          }

          if (field.name === 'firstName') {
            const firstName = field.value;
            queryString += `FirstName=${firstName}&`;
          }

          if (field.name === 'lastName') {
            const lastName = field.value;
            queryString += `LastName=${lastName}&`;
          }

          if (field.type === 'tel') {
            let mobileNumber = field.value;

            // Remove all extaneous characters from phone number and add a leading 1
            mobileNumber = "1" + mobileNumber.replace('(','').replace(')','').replace(' ','').replace('-','');
            queryString += `mobilenumber=${mobileNumber}&`;
          }
        }
      }
    });

    // If the error list is not blank, display it to the user
    if (errors) {
      errorDisplay.innerHTML = errors;
      errorDisplay.style.display = 'block';
      submitButton.style.opacity = 1;
    } else {
      // If an SMS endpoint has been specified, add SMS details to the servlet query
      if (form.dataset.smsendpoint !== '') {
        queryString += `smsEndpoint=${form.dataset.smsendpoint}&`;
        queryString += `shortcode=${form.dataset.shortcode}&`;
        queryString += `messageText=${form.dataset.messagetext}&`;
      }

      // Assemble the full enpoint URL and add it to the servlet query
      queryString += `endpoint=${form.dataset.endpoint + form.dataset.endpointkey}/send`;
      successUrl = form.dataset.redirect;
      internalEndpoint = `${form.dataset.path}.data.html?${queryString}`;
      const httpValues = {
        endpoint: internalEndpoint,
        successUrl: successUrl,
        errorDisplay
      }
      submitData(httpValues);
    }
  })
});

// functions to format phone numbers
function phoneNumberFormatter(evt) {
  const inputField = evt.target;
  if (inputField.value.length < 14) {
    inputField.value = formatPhoneNumber(inputField.value);
  };
}

function formatPhoneNumber(value) {
  // If phone number field is empty, return early
  if(!value) return value;

  // Get the value of the phone number field and remove unnecessary characters
  let phoneNumber = value.replace(/[^\d]/g, '');

  // Remove leading 1 if user has entered it
  if(phoneNumber[0] === '1') {
    phoneNumber = phoneNumber.substring(1);
  }

  const phoneNumberLength = phoneNumber.length;
  
  // If the phone number is less than 4 digits long, do nothing
  if (phoneNumberLength < 4) return phoneNumber;

  // If the phone number is less than 7 digits long, wrap the first 3 digits in parentheses and add a space before the 4th digit
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }

  // If the phone number is greater than 7 digits, wrapp the first 3 digits in parentheses, add a space before the 4th digit and a dash before the 7th digit 
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3,6)}-${phoneNumber.slice(6)}`;
}

// Function to perform validation
const validate = (field) => {
  const fieldType = field.type;
  const fieldValue = field.value;

  // If the field is required and is empty, notify the user that it's required
  if (field.hasAttribute('required') && fieldValue === '') {
    addError(field.parentNode.dataset.cmpRequiredMessage);
    return false;
  }

  // If the field should contain an email address and doesn't match email address format, notify the user
  if (fieldType === 'email' && !field.value.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
    addError(field.parentNode.dataset.cmpConstraintMessage);
    return false;
  }

  if (fieldType === 'tel') {
    // Hilary Duff-specific handling of SMS consent/phone number requirement
    const reqCheckbox = field.closest('form');
    if (fieldValue && !reqCheckbox.querySelector('input[name="smsConsent"]').checked) {
      addError(reqCheckbox.querySelector('input[name="smsConsent"]').closest('fieldset').dataset.requirementText);
      return false;
    }

    // Check first digits of area code and exchange (in (555) 555-5555 format) to determine if the number is a valid US/Canada number
    if (fieldValue && (fieldValue[1] === '0' || fieldValue[1] === '1' || fieldValue[6] === '0' || fieldValue[6] === '1')){
      addError('Please enter a valid US or Canadian phone number');
      return false;
    }

    // Check if the value is 14 digits long, which matches "(555) 555-5555" format for US/Canada numbers
    if (fieldValue && fieldValue.length !== 14) {
      addError(field.parentNode.dataset.cmpConstraintMessage);
      return false;
    }
  }
 
  if (fieldType === 'checkbox') {
    // Determine if a selection is required for this checkbox group
    if(field.closest('fieldset').dataset.required === 'true') {
      let checked = 0;
      // Find all of the checkboxes with the same name and determine if at least one is checked
      const checkboxes = document.querySelectorAll(`input[name=${field.name}]`);
      Array.prototype.slice.call(checkboxes).forEach(function (checkbox) {
        if (checkbox.checked) {
          checked = 1;
        }
      });
      if (!checked) {
        addError(field.closest('fieldset').dataset.requirementText);
        return false;
      }
    }

    // Hilary Duff-specific handling of SMS consent/phone number requirement
    if(field.name === 'smsConsent' && field.checked) {
      const thisForm = field.closest('form');
      if(thisForm.querySelector('input[type="tel"][name^="sms"]').value === '') {
        addError(field.closest('fieldset').dataset.requirementText);
        return false;
      }
    }
  }
  // If the function hasn't returned early, return true
  return true;
}

// Function to add validation errors to the list
const addError = (error) => {
  errors += `<li class="advancedformbutton__errorDisplay__error">${error}</li>`;
  return;
}

function submitData(values) {
  let oAjaxReq = new XMLHttpRequest();
  oAjaxReq.onload = function() {
    if (oAjaxReq.readyState === oAjaxReq.DONE) {
      if ((this.response.indexOf('"hasErrors":false') !== -1) && (this.response.indexOf("errors:") === -1)) {
        location = values.successUrl;
      } else {
        values.errorDisplay.innerHtml += `<li>There was an error submitting the form. Please try again.</li>`;
        values.errorDisplay.style.display = 'block';
      }
    }
  }
  oAjaxReq.open('get',values.endpoint,true);
  oAjaxReq.send();
}