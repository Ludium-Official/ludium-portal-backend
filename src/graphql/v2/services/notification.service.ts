import type { NotificationV2, NotificationV2Insert } from '@/db/schemas/v2/notifications';
import { notificationsV2Table } from '@/db/schemas/v2/notifications';
import type { DB } from '@/types';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

export class NotificationV2Service {
  constructor(private db: DB) {}

  async getNotifications(params: {
    userId: number;
    limit: number;
    offset: number;
    unreadOnly: boolean;
  }): Promise<{ data: NotificationV2[]; total: number }> {
    const conditions = [eq(notificationsV2Table.recipientId, params.userId)];

    if (params.unreadOnly) {
      conditions.push(isNull(notificationsV2Table.readAt));
    }

    const data = await this.db
      .select()
      .from(notificationsV2Table)
      .where(and(...conditions))
      .limit(params.limit)
      .offset(params.offset)
      .orderBy(desc(notificationsV2Table.createdAt));

    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(notificationsV2Table)
      .where(and(...conditions));

    return { data, total };
  }

  async getUnreadCount(userId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(notificationsV2Table)
      .where(
        and(eq(notificationsV2Table.recipientId, userId), isNull(notificationsV2Table.readAt)),
      );

    return result?.count ?? 0;
  }

  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    const result = await this.db
      .update(notificationsV2Table)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsV2Table.id, notificationId),
          eq(notificationsV2Table.recipientId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  }

  async markAllAsRead(userId: number): Promise<boolean> {
    await this.db
      .update(notificationsV2Table)
      .set({ readAt: new Date() })
      .where(
        and(eq(notificationsV2Table.recipientId, userId), isNull(notificationsV2Table.readAt)),
      );

    return true;
  }

  async create(data: NotificationV2Insert): Promise<NotificationV2> {
    const [notification] = await this.db.insert(notificationsV2Table).values(data).returning();

    return notification;
  }

  async delete(notificationId: string, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(notificationsV2Table)
      .where(
        and(
          eq(notificationsV2Table.id, notificationId),
          eq(notificationsV2Table.recipientId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  }
}
