importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyACKAgSg9k7UH-FzLP2Uxdbz2dYRNpf3o0",
  authDomain: "smartfinques-app-7f09c.firebaseapp.com",
  projectId: "smartfinques-app-7f09c",
  storageBucket: "smartfinques-app-7f09c.firebasestorage.app",
  messagingSenderId: "704663783919",
  appId: "1:704663783919:web:8d5350ec7598b100574e1a"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Mensaje recibido en segundo plano: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
