class OAuthSuite {
	
	constructor(suiteName) {
		var noOp = function() {};
		this.name = suiteName;
		this.triggerSignIn = noOp;
	}
	
	static postJson(uri, obj) {
		var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
		xmlhttp.open("POST", uri);
		xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == XMLHttpRequest.DONE) {
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
	ele.innerHTML = message.replace(/\n/g, '<br/>');
	return false;
}

function displayInformation(message) {
	var ele = document.querySelector('.login-information');
	ele.classList.remove('box-hidden');
	ele.innerHTML = message.replace(/\n/g, '<br/>');
	setTimeout(function() {
		ele.classList.add('box-hidden');
	}, 3000);
	return false;
}

function showUiCell(target, isVisibleLater) {
	var ele = (target);
	if(target.constructor === String) {
		ele = document.querySelector(target);
	}
	
	if(isVisibleLater) {
		ele.classList.remove('box-hidden');
	} else {
		ele.classList.add('box-hidden');
	}
}

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function postJson(uri, obj, cbText) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", uri);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			cbText(xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(obj));
}

function getJson(uri, cbText) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", uri);
	xhr.onreadystatechange = function () {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			cbText(xhr.responseText);
		}
	}
	xhr.send(null);
}
