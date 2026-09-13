// // src/notifications/firebase.service.ts
// import { Injectable, OnModuleInit } from '@nestjs/common';
// import * as admin from 'firebase-admin';

// import serviceAccount from '../notifications/service-account.json';

// @Injectable()
// export class FirebaseService implements OnModuleInit {
//   onModuleInit() {
//     if (admin.apps.length === 0) {
//       try {
//         admin.initializeApp({
//           credential: admin.credential.cert(
//             serviceAccount as admin.ServiceAccount, // <--- Add 'as admin.ServiceAccount'
//           ),
//         });
//         console.log('🔥 Firebase Admin: Connection Successful');
//       } catch (error) {
//         console.error('❌ Firebase Admin Initialization Failed', error.message);
//       }
//     }
//   }
//   async sendPush(
//     token: string,
//     title: string,
//     body: string,
//     data?: Record<string, any>,
//   ) {
//     if (!token) return;

//     // Convert all data values to strings to prevent FCM errors
//     const stringData: Record<string, string> = {};
//     if (data) {
//       Object.keys(data).forEach((key) => {
//         stringData[key] = String(data[key]);
//       });
//     }

//     try {
//       const response = await admin.messaging().send({
//         notification: { title, body },
//         data: stringData,
//         token,
//       });
//       console.log('🚀 Notification sent successfully:', response);
//       return response;
//     } catch (error) {
//       if (
//         error.code === 'messaging/registration-token-not-registered' ||
//         error.code === 'messaging/invalid-registration-token'
//       ) {
//         console.warn(
//           '🗑️ Dead token detected. Recommendation: Clear this from DB.',
//         );
//       }
//       console.error('❌ FCM Send Error:', error.message);
//     }
//   }
// }

// src/notifications/firebase.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import serviceAccount from '../notifications/service-account.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
        });
        console.log('🔥 Firebase Admin: Connection Successful');
      } catch (error) {
        console.error('❌ Firebase Admin Initialization Failed', error.message);
      }
    }
  }

  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!token) return;

    // FCM requires all data values to be strings
    const stringData: Record<string, string> = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        stringData[key] = String(data[key]);
      });
    }

    try {
      const response = await admin.messaging().send({
        notification: { title, body },
        data: stringData,
        // ADD THIS BLOCK FOR SOUND & CHANNELS
        android: {
          priority: 'high',
          notification: {
            channelId: 'kitchen_alerts', // Must match Notifee channel ID
            sound: 'notification', // Must match res/raw/notification.mp3
            clickAction: 'fcm.ACTION.EVENT', // Standard for background clicks
          },
        },
        // ADD THIS FOR iOS SOUND
        apns: {
          payload: {
            aps: {
              sound: 'notification.wav',
            },
          },
        },
        token,
      });

      console.log('🚀 Notification sent successfully:', response);
      return response;
    } catch (error) {
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        console.warn('🗑️ Dead token detected.');
      }
      console.error('❌ FCM Send Error:', error.message);
    }
  }
}
