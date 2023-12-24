import db from '@src/utils/db';

import expo, { ExpoPushMessage } from 'expo-server-sdk';

const expoPush = new expo();

async function sendNotificationToDevice(deviceToken: string, title: string, body: string) {
  const message: ExpoPushMessage = {
    to: deviceToken,
    title: title,
    body: body,
  };

  try {
    const receipts = await expoPush.sendPushNotificationsAsync([message]);
    console.log('Push notification sent successfully:', receipts);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

const findEmployeeDeviceTokensByCompanyID = async (companyID: bigint) => {
  const employees = await db.user.findMany({
    where: {
      companyID: companyID,
      companyRole: 'Employee',
    },
    select: {
      deviceToken: true,
    },
  });

  return employees.map((employee) => ({
    deviceToken: employee.deviceToken || '',
  }));
}

const findEmployeeDeviceTokensByName = async (name: string, companyID: bigint) => {
  const user = await db.user.findFirst({
    where: {
      name: name,
      companyID: companyID,
      companyRole: 'Employee',
    },
    select: {
      deviceToken: true,
    },
  });

  return user?.deviceToken || null;
}

const updateUserDeviceToken = async (userID: string, deviceToken: string) => {
  db.user.update({
    where: {
      id: userID,
    },
    data: {
      deviceToken: deviceToken,
    },
  });
};


export default {
  sendNotificationToDevice,
  findEmployeeDeviceTokensByCompanyID,
  findEmployeeDeviceTokensByName,
  updateUserDeviceToken
};