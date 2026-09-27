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
//             serviceAccount as admin.ServiceAccount,
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

//     // FCM requires all data values to be strings
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
//         // ADD THIS BLOCK FOR SOUND & CHANNELS
//         android: {
//           priority: 'high',
//           notification: {
//             channelId: 'kitchen_alerts', // Must match Notifee channel ID
//             sound: 'notification', // Must match res/raw/notification.mp3
//             clickAction: 'fcm.ACTION.EVENT', // Standard for background clicks
//           },
//         },
//         // ADD THIS FOR iOS SOUND
//         apns: {
//           payload: {
//             aps: {
//               sound: 'notification.wav',
//             },
//           },
//         },
//         token,
//       });

//       console.log('🚀 Notification sent successfully:', response);
//       return response;
//     } catch (error) {
//       if (
//         error.code === 'messaging/registration-token-not-registered' ||
//         error.code === 'messaging/invalid-registration-token'
//       ) {
//         console.warn('🗑️ Dead token detected.');
//       }
//       console.error('❌ FCM Send Error:', error.message);
//     }
//   }
// }

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (admin.apps.length > 0) {
      return;
    }

    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
        /\\n/g,
        '\n',
      );

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Missing Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log('🔥 Firebase Admin: Connection Successful');
    } catch (error) {
      console.error(
        '❌ Firebase Admin Initialization Failed:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!token) return;

    const stringData: Record<string, string> = {};

    if (data) {
      Object.keys(data).forEach((key) => {
        stringData[key] = String(data[key]);
      });
    }

    try {
      const response = await admin.messaging().send({
        notification: {
          title,
          body,
        },

        data: stringData,

        android: {
          priority: 'high',
          notification: {
            channelId: 'kitchen_alerts',
            sound: 'notification',
            clickAction: 'fcm.ACTION.EVENT',
          },
        },

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
    } catch (error: any) {
      if (
        error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-registration-token'
      ) {
        console.warn('🗑️ Dead token detected.');
      }

      console.error('❌ FCM Send Error:', error?.message || error);
    }
  }
}
