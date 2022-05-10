class OAuthSuite {

    constructor(suiteName) {
        var noOp = function () { };
        this.name = suiteName;
        this.triggerSignIn = noOp;
    }

    static postJson(uri, obj) {
        var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
        xmlhttp.open("POST", uri);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === XMLHttpRequest.DONE) {
                console.log('response: ', xmlhttp.responseText)
            }
        }
        xmlhttp.send(JSON.stringify(obj));
    }

    static makeGoogleInstance() {
        var suite = new OAuthSuite('google');
        suite.triggerSignIn = () => {
            document.querySelector('.g-signin2').querySelector('.abcRioButton').click();
        };
        suite.onSignIn = (googleUser) => {
            var profile = googleUser.getBasicProfile();

            console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
            console.log('Name: ' + profile.getName());
            console.log('Image URL: ' + profile.getImageUrl());
            console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

            var id_token = googleUser.getAuthResponse().id_token;
            console.log('id_token: ' + id_token);

            var signinObj = {
                cat: 'google',
                email: profile.getEmail(),
                token: id_token,
            }
            OAuthSuite.postJson('/api/signin', signinObj);
        };
        return suite;
    }

    static makeOauthPreset() {
        var authMap = {
            google: OAuthSuite.makeGoogleInstance()
        }
        return authMap;
    }
}

function oauthGoogleSignIn() {
    oauthPreset.google.triggerSignIn();
}

function onGoogleSignIn(ev) {
    oauthPreset.google.onSignIn(ev);
}

function oauthFacebookSignIn() {
    console.info('not implemented');
}

function displayError(message) {
    var ele = document.querySelector('.login-error');
    ele.classList.remove('box-hidden');
    ele.innerHTML = message.replaceAll('\\n', '\n').replace(/\n/g, '<br/>');
    return false;
}

function displayInformation(message) {
    var ele = document.querySelector('.login-information');
    ele.classList.remove('box-hidden');
    ele.innerHTML = message.replaceAll('\\n', '\n').replace(/\n/g, '<br/>');
    setTimeout(function () {
        ele.classList.add('box-hidden');
    }, 3000);
    return false;
}

function showUiCell(target, isVisibleLater) {
    var ele = (target);
    if (target.constructor === String) {
        ele = document.querySelector(target);
    }

    if (isVisibleLater) {
        ele.classList.remove('box-hidden');
    } else {
        ele.classList.add('box-hidden');
    }
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function fillEmail() {
    var cookieEmail = getCookie('email');
    if (cookieEmail) {
        document.querySelector('#emailAddr').value = cookieEmail;
    }
}

function checkEmail(email) {
    document.cookie = `email=${email};path=/`;
    if (email.length <= 0) {
        return displayError('Please enter E-mail');
    }
    return true;
}

function checkPassword(password, message) {
    if (password.length <= 0) {
        return displayError(message || 'Please enter Password');
    }
    return true;
}

function checkLogin() {
    var email = document.querySelector('#emailAddr').value;
    var password = document.querySelector('#password').value;
    return checkEmail(email) && checkPassword(password);
}

function checkSignUp() {
    var email = document.querySelector('#emailAddr').value;
    var password = document.querySelector('#password').value;
    var passwordConfirm = document.querySelector('#passwordConfirm').value;
    if (false === (checkEmail(email) && checkPassword(password))) {
        return false;
    }
    if (password === passwordConfirm) {
        return true;
    }
    return displayError('Confirm Password not match');
}

function checkPasswordChange() {
    var oldPassword = document.querySelector('#oldPassword').value;
    var newPassword = document.querySelector('#password').value;
    var passwordConfirm = document.querySelector('#passwordConfirm').value;

    if (!checkPassword(oldPassword, 'Please enter Old Password')) {
        return false;
    }
    if (!checkPassword(newPassword, 'Please enter New Password')) {
        return false;
    }
    if (!checkPassword(passwordConfirm, 'Please enter Confirm New Password')) {
        return false;
    }
    if (newPassword === passwordConfirm) {
        return true;
    }
    return displayError('Confirm Password not match');
}

function postJson(uri, obj, cbText) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", uri);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            cbText(xhr.responseText);
        }
    }
    xhr.send(JSON.stringify(obj));
}

function getJson(uri, cbText) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", uri);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            cbText(xhr.responseText);
        }
    }
    xhr.send(null);
}

function updatePassword() {
    var isValid = checkPasswordChange();

    if (!isValid) {
        return false;
    }

    var userId = parseInt(document.querySelector('#userId').value);
    var oldPassword = document.querySelector('#oldPassword').value;
    var password = document.querySelector('#password').value;

    var obj = {
        userId,
        oldPassword,
        password
    };

    showUiCell('.login-error', false);
    showUiCell('.login-information', false);
    document.querySelector('#oldPassword').value = '';
    document.querySelector('#password').value = '';
    document.querySelector('#passwordConfirm').value = '';

    postJson('/user/reset-password', obj, (text) => {
        var result = JSON.parse(text);
        if (result.message) {
            return displayError(result.message);
        }
        if (result.information) {
            return displayInformation(result.information);
        }
    });
    return false;
}
