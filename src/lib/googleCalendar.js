/**
 * Google Calendar API Implementation
 * This handles OAuth2 authentication via Google Identity Services (GSI)
 * and event creation via the Google API Client Library (GAPI).
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const PRINCIPAL_CALENDAR_ID = import.meta.env.VITE_PRINCIPAL_CALENDAR_ID || 'primary';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gsiInited = false;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export const initGoogleApi = async () => {
    if (gapiInited && gsiInited) return true;

    try {
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client')
        ]);

        await new Promise((resolve, reject) => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined at request time
        });
        gsiInited = true;
        return true;
    } catch (err) {
        console.error('Error initializing Google APIs:', err);
        throw err;
    }
};

export const createGoogleCalendarEvent = async (eventDetails) => {
    if (!gapiInited || !gsiInited) {
        await initGoogleApi();
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }

            try {
                // Ensure times are formatted correctly (YYYY-MM-DDTHH:mm:00)
                const startTime = `${eventDetails.date}T${eventDetails.startTime}:00`;
                const endTime = `${eventDetails.date}T${eventDetails.endTime}:00`;

                // Handle multiple visitors
                const names = eventDetails.visitorNames
                    ? eventDetails.visitorNames.filter(n => n).join(', ')
                    : eventDetails.visitorName;

                const event = {
                    'summary': `Meeting with ${names}`,
                    'location': 'Lyceum Panadura',
                    'description': `Purpose: ${eventDetails.purpose}\nHost: ${eventDetails.meetingWith}${eventDetails.meetingRole ? ` (${eventDetails.meetingRole})` : ''}\nVisitors: ${names}`,
                    'start': {
                        'dateTime': new Date(startTime).toISOString(),
                        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    'end': {
                        'dateTime': new Date(endTime).toISOString(),
                        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    'reminders': {
                        'useDefault': true
                    }
                };

                const response = await window.gapi.client.calendar.events.insert({
                    'calendarId': PRINCIPAL_CALENDAR_ID,
                    'resource': event
                });

                resolve(response.result);
            } catch (err) {
                console.error('Failed to create calendar event:', err);
                reject(err);
            }
        };

        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

export const updateGoogleCalendarEvent = async (eventId, eventDetails) => {
    if (!gapiInited || !gsiInited) {
        await initGoogleApi();
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }

            try {
                const startTime = `${eventDetails.date}T${eventDetails.startTime}:00`;
                const endTime = `${eventDetails.date}T${eventDetails.endTime}:00`;

                const names = eventDetails.visitorNames
                    ? eventDetails.visitorNames.filter(n => n).join(', ')
                    : eventDetails.visitorName;

                const event = {
                    'summary': `Meeting with ${names}`,
                    'location': 'Lyceum Panadura',
                    'description': `Purpose: ${eventDetails.purpose}\nHost: ${eventDetails.meetingWith}${eventDetails.meetingRole ? ` (${eventDetails.meetingRole})` : ''}\nVisitors: ${names}`,
                    'start': {
                        'dateTime': new Date(startTime).toISOString(),
                        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    'end': {
                        'dateTime': new Date(endTime).toISOString(),
                        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                };

                const response = await window.gapi.client.calendar.events.patch({
                    'calendarId': PRINCIPAL_CALENDAR_ID,
                    'calendarEventId': eventId,
                    'resource': event
                });

                resolve(response.result);
            } catch (err) {
                console.error('Failed to update calendar event:', err);
                reject(err);
            }
        };

        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

export const deleteGoogleCalendarEvent = async (eventId) => {
    if (!gapiInited || !gsiInited) {
        await initGoogleApi();
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }

            try {
                await window.gapi.client.calendar.events.delete({
                    'calendarId': PRINCIPAL_CALENDAR_ID,
                    'calendarEventId': eventId
                });
                resolve();
            } catch (err) {
                console.error('Failed to delete calendar event:', err);
                reject(err);
            }
        };

        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};
