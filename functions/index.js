const functions = require("firebase-functions");
const admin = require('firebase-admin');
const { firestore } = require("firebase-admin");
var moment = require('moment-timezone');
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

var db = admin.firestore();

exports.example = functions.https.onRequest((request, response) => {
    var ls = new Array();
    // Get users
    db.collection('users').get().then(snapshot => {
        snapshot.docs.forEach(doc => {
            let hour = doc.data().alarm_hour;
            let minute = doc.data().alarm_minute;
            let id = doc.id.toString();
            functions.logger.log(id, hour, minute);
            ls.push(id);
        });
    });
    console.log(ls);
    response.send("OK");
});

function sendNotification(token, title, message) {
    const payload = {
        token: token,
        notification: {
            title: title,
            body: message
        },
        data: {
            body: message,
        }
    };

    admin.messaging().send(payload).then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', token, title, response);
        return { success: true };
    }).catch((error) => {
        return { error: error.code };
    });

}

exports.notificationTester = functions.https.onRequest((request, response) => {

    var docRef = db.collection("users").doc("nO9eXqQw8UVJ5U7DY7zjALFbaZe2");
    docRef.get().then((doc) => {
        if (doc.exists) {
            console.log("Document data:", doc.data().nickname);
            let tk = doc.data().fcmID;
            sendNotification(tk, "ring", "ring");
            // uhour==hour && minute == uminute The proper way, kinda, we are only doing on the dot alarms

        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });

    response.send("OK");

});

function fetchUsersToAlert(hour, minute) {
    console.log('Fetching alarms for ', hour, minute);
    // Alarm cycle trigger.
    let ls = [];
    db.collection('users').get().then(snapshot => {
        snapshot.docs.forEach(doc => {
            let uhour = doc.data().alarm_hour;
            let uminute = doc.data().alarm_minute;
            let uid = doc.id.toString();
            let tk = doc.data().fcmID;
            if (uhour == hour) {
                sendNotification(tk, "ring", "ring");
                ls.push(uid);
            }
            functions.logger.log(uid, hour, minute);
        });
    });

    return ls;


}

// The heartbeat schedule is counted on UTC, so every hour the heartbeat runs.
// Converted to CDT because timezones make no sense whatsoever.
// It runs from 1 am to 10 am, to swave costs.
exports.heartbeat = functions.pubsub.schedule('every 60 minutes from 19:00 to 05:00').onRun((context) => {
    // this is tesrrible and should be fixed 
    // by a far less tired Alicia
    // Moment and Moment-timezone are installed and usable. 
    // For demo purposes this is not acceptable but also the only thing i could come up with
    // So it stays. 
    const offset = 5; // Server is on UTC, no idea why. This sets it to CST.
    var d = new Date();
    d.setHours(d.getHours() - offset); // My shame, my darkest hour.
    var tstamp = d;
    var h = tstamp.getHours();
    var m = tstamp.getMinutes();
    var s = tstamp.toString();
    console.log(s);

    var usersToAlert = fetchUsersToAlert(h, m);
    console.log("", usersToAlert);


    return null;
});

