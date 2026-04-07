importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSy...",
  authDomain: "smartfinques-app-7f09c.firebaseapp.com",
  projectId: "smartfinques-app-7f09c",
  messagingSenderId: "704663783919",
  appId: "1:704663783919:web:8d5350ec7598b100574e1a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png"
  });
});
