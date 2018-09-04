import { ActivityMessage } from './common/messages/activity-message';
import { AuthMessage } from './common/messages/auth-message';
import { ErrorMessage } from './common/messages/error-message';
import { Message } from './common/messages/message';
import { MessageType } from './common/messages/message-type';
import { OpenOnRemoteDeviceMessage } from './common/messages/open-on-remote-device-message';

// Scopes required for this extension
// See FAQ.md for more information.
const scopes = ['UserActivity.ReadWrite.CreatedByApp', 'Device.Read', 'Device.Command', 'offline_access'];

// Auth variables
let accessToken: string;
let refreshToken: string;
let clientId: string;

// Browser resources
let browserName: string;
let browserIcon: string;

// Used to cache the users devices (since loading devices can take a long time)
let userDevices: any;

// Redirect url for auth login
let redirectURL: string;

// Client branding
if (navigator.userAgent.includes('OPR/')) {
    browserName = 'Opera';
    browserIcon = 'https://timeline.dominicmaas.co.nz/assets/browsers/opera-128.png';

} else if (navigator.userAgent.includes('Vivaldi')) {
    browserName = 'Vivaldi';
    browserIcon = 'https://timeline.dominicmaas.co.nz/assets/browsers/vivaldi-32.png';

} else if (navigator.userAgent.includes('Chrome')) {
    browserName = 'Google Chrome';
    browserIcon = 'https://timeline.dominicmaas.co.nz/assets/browsers/chrome-32.png';

} else if (navigator.userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    browserIcon = 'https://timeline.dominicmaas.co.nz/assets/browsers/firefox.png';
}

// Log the browser name
console.debug("Selected Browser: " + browserName);

// Client Id
if (navigator.userAgent.includes('Edge') || navigator.userAgent.includes('OPR/')) {
    // Microsoft Edge or Opera
    clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
    redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';
    console.debug('[Auth Setup] Using new auth based system.');

} else if (navigator.userAgent.includes('Firefox')
    && (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Tablet'))) {
    // Firefox for phones and tablets
    clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
    redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';
    console.debug('[Auth Setup] Using new auth based system.');

} else if (navigator.userAgent.includes('Firefox')) {
    // Mozilla Add-Ons Catalog – (Firefox, Tor Browser)
    clientId = '6a421ae0-f2b1-4cf9-84e0-857dc0a4c9a3';
    redirectURL = 'https://5bed674f74ec59875d4860fbe854e945b81b4dac.extensions.allizom.org/';
    console.debug('[Auth Setup] Using legacy Firefox auth based system.');

} else if (navigator.userAgent.includes('Chrome')) {
    // Chrome Web Store – (Google Chrome, Chromium, Vivaldi, others)
    clientId = '70c5f06f-cef4-4541-a705-1adeea3fa58f';
    redirectURL = 'https://meokcjmjkobffcgldbjjklmaaediikdj.chromiumapp.org/';
    console.debug('[Auth Setup] Using legacy Chrome auth based system.');

} else {
    // Use the new auth system
    clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
    redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';
    console.debug('[Auth Setup] Using new auth based system.');
}

// Get stored tokens
chrome.storage.local.get(['access_token', 'refresh_token', 'new_login'], (data) => {
    // Get the access token (may be null if not logged in)
    if (data.access_token !== null) {
        accessToken = data.access_token;
    }

    // Get the refresh token (may be null if not logged in)
    if (data.refresh_token !== null) {
        refreshToken = data.refresh_token;
    }

    // If the user has not logged in before, set them up to use the fallback auth (now primary)
    // auth system or if the user has logged in before with the new system.
    if (accessToken === undefined || data.new_login === true) {
        clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
        redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';
        console.debug('[Auth Setup] Change to use new auth based system (either no access token, or logged in with the new system).');
    }

    // This is a weird place to put this code, but it needs to run after the access
    // token has been loaded from storage.
    if (accessToken !== undefined) {
        getRemoteDevicesAsync().then((devices) => {
            userDevices = devices;
        });
    }
});

/**
 * Submit collected activity data to Microsoft
 * @param webActivity The activity to post
 * @param secondAttempt If this is the second attempt at posting the activity
 */
async function sendActivityAsync(webActivity: ActivityMessage, secondAttempt: boolean = false): Promise<void> {
    // Don't run if the user has not logged in
    if (!accessToken) {
        console.error('Unauthorized, no auth token set.');
        return;
    }

    // Get the current date time and time zone
    const date = new Date().toISOString();

    // Encode the url with base64, then make url friendly
    const activityId = window.btoa(webActivity.Description).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');

    // Create the microsoft graph activity url
    const url = `https://graph.microsoft.com/v1.0/me/activities/${activityId}`;

    // Get icon
    const icon = webActivity.IconImage === '' ? browserIcon : webActivity.IconImage;

    // Build the data
    const data = JSON.stringify({
        activationUrl: webActivity.Description,
        activitySourceHost: webActivity.OriginUrl,
        appActivityId: activityId,
        appDisplayName: browserName,
        fallbackUrl: webActivity.Description,
        historyItems: [{
            activeDurationSeconds: 30,
            startedDateTime: date
        }],
        visualElements: {
            attribution: {
                addImageQuery: false,
                alternateText: webActivity.OriginUrl,
                iconUrl: icon
            },
            content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                backgroundImage: webActivity.BackgroundImage,
                body:
                [{
                    items: [{
                        maxLines: 3,
                        size: 'large',
                        text: webActivity.Title,
                        type: 'TextBlock',
                        weight: 'bolder',
                        wrap: true,
                    }, {
                        maxLines: 3,
                        size: 'default',
                        text: webActivity.Description,
                        type: 'TextBlock',
                        wrap: true
                    }],
                    type: 'Container',
                }],
                type: 'AdaptiveCard'
            },
            description: webActivity.Description,
            displayText: webActivity.Title,
        }
    });

    // Call the url and get the response
    const response = await fetch(url, {
        body: data,
        cache: 'no-cache',
        headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        method: 'PUT'
    });

    // If we get a 401 in return, we need to refresh the token
    if (response.status === 401) {
        console.debug("Returned 401, refreshing access token...");

        // Attempt to refresh the token
        const refreshStatus = await refreshTokenAsync();

        // If the refresh is successful and this is our first try,
        // call the method again
        if (refreshStatus && !secondAttempt) {
            return await sendActivityAsync(webActivity, true);
        } else {
            console.error("Could not post activity to Windows Timeline: " + webActivity);
            return;
        }
    }

    const body = await response.json();
    console.debug(body);
}

// Open the Microsoft account login dialog, let the user login,
// grab the token and then store it for later use.

/**
 * Login the user into their Microsoft Account.
 */
function login() {
    // A little messy, but when logging in, force the user to use the new auth system
    clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
    redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';

    // Build the request url
    let authURL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    authURL += `?client_id=${clientId}`;
    authURL += `&response_type=code`;
    authURL += `&response_mode=query`;
    authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
    authURL += `&scope=${encodeURIComponent(scopes.join(' '))}`;

    // The new auth system just opens a new tab for the user to login
    // Is more likely to work compared to the old system. Since login only
    // supports the new system, all old code has been removed.
    if (typeof browser === 'undefined' || !browser) {
        // Open the URL in a new tab
        chrome.tabs.create({ url: authURL });
    } else {
        // Open the URL in a new tab
        browser.tabs.create({ url: authURL });
    }
}

/**
 * Logout the user from their Microsoft Account and delete any cached resources.
 */
function logout() {
    // Remove the stored values
    chrome.storage.local.remove('preferred_username');
    chrome.storage.local.remove('access_token');

    // Update the local variables
    accessToken = undefined;
    refreshToken = undefined;

    // The user has logged out, so we can now use the new auth system (if not already)
    clientId = '3e8214c9-265d-42b6-aa93-bdd810fda5e6';
    redirectURL = 'https://timeline.dominicmaas.co.nz/auth-callback/index.html';
    console.debug('[Auth Setup] Change to use new auth based system.');
}

/**
 * Callback for the Login method. Extracts the oauth code from the
 * redirect url, calls the azure function to get both an access and
 * refresh token.
 * @param redirectUrl Url containing the oauth code
 */
async function validateLoginAsync(redirectUrl: string) {
    // If using fallback, we need to close the window (as we cannot
    // do it in the script)
    // Close the tab as it cannot be closed in the window
    chrome.tabs.query({ url: redirectUrl }, (tabs) => {
        chrome.tabs.remove(tabs[0].id);
    });

    // Get the data from the redirect url
    const data = redirectUrl.split('?')[1];

    // Split the data into pairs
    const dataArray = data.split('&');

    // Object that will store the key value pairs
    const parameters = {
        code: null,
        error: null,
        error_description: null
    };

    // Store the data into a key value pair object
    for (const pair in dataArray) {
        const split = dataArray[pair].split('=');
        parameters[decodeURIComponent(split[0])] = decodeURIComponent(split[1]);
    }

    // If the request was not successful, log it
    if (parameters.error != null) {
        // Log the error, TODO: show some type of error dialog.
        console.error('Error validating token: ' + parameters);

        // Clear any tokens that may be cached.
        logout();
    } else {
        // Get the code
        const urlCode = parameters.code;

        // Call the wrapper service which will handle getting the access and refresh tokens
        // The code for this function is located in the 'auth-backend' branch.
        const response = await fetch('https://ge-functions.azurewebsites.net/api/get-token', {
            body: JSON.stringify({
                client_id: clientId,
                code: urlCode,
                redirect_uri: redirectURL,
                scope: scopes.join(' '),
            }),
            method: 'POST'
        });

        // Grab the response body
        const body = await response.json();

        // If the error is not null, run this code
        if (body.error !== undefined) {
            // Show an error message to the user and logout
            showErrorMessage(new ErrorMessage('Error refreshing token', body.error_description));
            console.error('Error validating token: ' + body);
            logout();
            return;
        }

        // Save the token in storage so it can be used later
        chrome.storage.local.set({
            access_token : body.access_token,
            new_login: true,
            refresh_token: body.refresh_token
        }, null);

        // Update the local variable
        accessToken = body.access_token;
        refreshToken = body.refresh_token;

        // Update the users devices
        getRemoteDevicesAsync().then((devices) => {
            userDevices = devices;
        });
    }
}

/**
 * Calls the refresh azure function which will return a new refresh and
 * access token so we can continue accessing resources from the Microsoft Graph.
 */
async function refreshTokenAsync(): Promise<boolean> {
    // Perform a post request to update the stored token
    const response = await fetch('https://ge-functions.azurewebsites.net/api/refresh-token', {
        body: JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectURL,
            refresh_token: refreshToken,
            scope: scopes.join(' ')
        }),
        method: 'POST'
    });

    // Grab the response body
    const body = await response.json();

    // If the error is not null, run this code
    if (body.error !== undefined) {
        // Show an error message to the user and logout
        showErrorMessage(new ErrorMessage('Error refreshing token', body.error_description));
        console.error('Error refreshing token: ' + body);
        logout();
        return false;
    }

    // Save the token in storage so it can be used later
    chrome.storage.local.set({
        access_token : body.access_token,
        refresh_token: body.refresh_token
    }, null);

    // Update the local variable
    accessToken = body.access_token;
    refreshToken = body.refresh_token;

    // Everything was successful
    return true;
}

/**
 * Return a list of recent user activities.
 * @param secondAttempt If this is the second attempt at calling this function
 */
async function getUserActivitiesAsync(secondAttempt: boolean = false): Promise<any> {
    // Attempt to get a list of user activities
    const response = await fetch('https://graph.microsoft.com/beta/me/activities?$top=20', {
        cache: 'no-cache',
        headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        method: 'GET'
    });

    // If we get a 401 in return, we need to refresh the token
    if (response.status === 401) {
        console.debug("Returned 401, refreshing access token...");

        // Attempt to refresh the token
        const refreshStatus = await refreshTokenAsync();

        // If the refresh is successful and this is our first try,
        // call the method again
        if (refreshStatus && !secondAttempt) {
            return await getUserActivitiesAsync(true);
        } else {
            return {
                payload: null,
                reason: 'Could not authorize user. Please try again.',
                success : false
            };
        }
    }

    // Grab the JSON body
    const body = await response.json();

    // Return the list of devices
    return {
        payload: body.value,
        reason: '',
        success : true
    };
}

/**
 * Returns a list of devices that belong to the logged in users account
 * @param secondAttempt If this is the second attempt at calling this function
 */
async function getRemoteDevicesAsync(secondAttempt: boolean = false): Promise<any> {
    // Attempt to grab a list of the users devices
    const response = await fetch('https://graph.microsoft.com/beta/me/devices/', {
        cache: 'no-cache',
        headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        method: 'GET'
    });

    // If we get a 401 in return, we need to refresh the token
    if (response.status === 401) {
        console.debug("Returned 401, refreshing access token...");

        // Attempt to refresh the token
        const refreshStatus = await refreshTokenAsync();

        // If the refresh is successful and this is our first try,
        // call the method again
        if (refreshStatus && !secondAttempt) {
            return await getRemoteDevicesAsync(true);
        } else {
            return {
                payload: null,
                reason: 'Could not authorize user. Please try again.',
                success : false
            };
        }
    }

    // Grab the JSON body
    const body = await response.json();

    // Return the list of devices
    return {
        payload: body.value,
        reason: '',
        success : true
    };
}

async function launchOnRemoteDeviceAsync(payload: OpenOnRemoteDeviceMessage, secondAttempt: boolean = false): Promise<void> {
    // Attempt to open the url on the users device
    const response = await fetch('https://graph.microsoft.com/beta/me/devices/' + payload.DeviceId + '/commands', {
        body: '{"type":"LaunchUri","payload":{"uri":"' + payload.Url + '"}}',
        cache: 'no-cache',
        headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        method: 'POST'
    });

    // If we get a 401 in return, we need to refresh the token
    if (response.status === 401) {
        console.debug("Returned 401, refreshing access token...");

        // Attempt to refresh the token
        const refreshStatus = await refreshTokenAsync();

        // If the refresh is successful and this is our first try,
        // call the method again
        if (refreshStatus && !secondAttempt) {
            return await launchOnRemoteDeviceAsync(payload, true);
        } else {
            console.error('Could not authorize user. Please try again.');
            showErrorMessage(new ErrorMessage('Could not open link', 'Could not authorize user. Please try again.'));
        }
    }

    // Grab the JSON body
    const body = await response.json();
    console.debug(body);
}

/**
 * Display an error message to the user
 * @param message The error message
 */
function showErrorMessage(message: ErrorMessage) {
    chrome.notifications.create('', {
        iconUrl: 'images/icon_128.png',
        message: message.Description,
        title: message.Title,
        type: "basic",
    }, null);
}

/**
 * Handle messages sent to this background script. Handles either
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (typeof request === 'undefined') {
        return;
    }

    // Send a web activity request to the Microsoft Graph only if
    // the tab is not incognito.
    if ((request as Message).Type === MessageType.PublishActivity) {
        if (!sender.tab.incognito) {
            sendActivityAsync(request as ActivityMessage);
        } else {
            console.debug('Tab is in incognito mode, not sending activity.');
        }
        return;
    }

    // The user has requested a login, open the login dialog
    if ((request as Message).Type === MessageType.Login) {
        login();
        return;
    }

    // The user has requested a logout
    if ((request as Message).Type === MessageType.Logout) {
        logout();
        return;
    }

    // The user has requested a logout
    if ((request as Message).Type === MessageType.Error) {
        // Show a notification
        showErrorMessage(request as ErrorMessage);
        return;
    }

    if ((request as Message).Type === MessageType.AuthSubmit) {
        // Get the message and then validate the token
        const message = request as AuthMessage;
        validateLoginAsync(message.QueryString);
        return;
    }

    if ((request as Message).Type === MessageType.GetActivities) {
        // Return the users activities
        getUserActivitiesAsync().then((data) => {
            sendResponse(data);
        });

        return true;
    }

    if ((request as Message).Type === MessageType.GetRemoteDevices) {
        // If we have cached devices, return them
        if (userDevices !== undefined) {
            // Send the response
            sendResponse(userDevices);

            // Update cached values
            getRemoteDevicesAsync().then((data) => {
                userDevices = data;
            });

        } else {
            // Get a list of devices, cache them and then send the response
            getRemoteDevicesAsync().then((data) => {
                userDevices = data;
                sendResponse(data);
            });
        }

        return true;
    }

    if ((request as Message).Type === MessageType.OpenOnRemoteDevice) {
        launchOnRemoteDeviceAsync(request as OpenOnRemoteDeviceMessage);
        return;
    }
});
