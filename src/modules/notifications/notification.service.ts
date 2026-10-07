import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { NotificationType, NotificationChannel } from "@prisma/client";

export class NotificationService {
  static async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    return db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notif = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif || notif.userId !== userId) {
      throw AppError.notFound("Notification not found");
    }

    return db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async dispatch(params: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    channel?: NotificationChannel;
  }) {
    return db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || NotificationType.SYSTEM_ALERT,
        channel: params.channel || NotificationChannel.IN_APP,
      },
    });
  }
}
