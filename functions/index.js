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


function fetchUsersToAlert(hour, minute) {
    console.log('Fetching alarms for ', hour, minute);
    let ls = [];
    // Get users
    db.collection('users').get().then(snapshot => {
        snapshot.docs.forEach(doc => {
            let uhour = doc.data().alarm_hour;
            let uminute = doc.data().alarm_minute;
            let uid = doc.id.toString();
            // uhour==hour && minute == uminute The proper way, kinda, we are only doing on the dot alarms
            if (uhour==hour) {
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

    var usersToAlert = fetchUsersToAlert(h,m);
    console.log("",usersToAlert);


    return null;
});