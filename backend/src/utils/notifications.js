export async function createNotification(tenantModels, payload) {
  const { Notification } = tenantModels;

  if (!payload?.userId) {
    return null;
  }

  return Notification.create({
    instituteId: payload.instituteId,
    userId: payload.userId,
    actorUserId: payload.actorUserId || null,
    category: payload.category,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType || "",
    entityId: payload.entityId || null,
    linkTo: payload.linkTo || "",
    metadata: payload.metadata || {},
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt
  });
}

export async function createNotificationsForUsers(tenantModels, payload) {
  const { Notification } = tenantModels;
  const userIds = [...new Set((payload.userIds || []).filter(Boolean).map((item) => item.toString()))];

  if (!userIds.length) {
    return [];
  }

  return Notification.insertMany(
    userIds.map((userId) => ({
      instituteId: payload.instituteId,
      userId,
      actorUserId: payload.actorUserId || null,
      category: payload.category,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: payload.entityType || "",
      entityId: payload.entityId || null,
      linkTo: payload.linkTo || "",
      metadata: payload.metadata || {},
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt
    }))
  );
}

export async function listActiveAlumniUserIds(tenantModels, instituteId, excludeUserIds = []) {
  const { User } = tenantModels;
  const excluded = excludeUserIds.filter(Boolean).map((item) => item.toString());
  const filter = {
    instituteId,
    role: "alumni",
    isActive: true
  };

  if (excluded.length) {
    filter._id = { $nin: excluded };
  }

  const users = await User.find(filter).select("_id").lean();
  return users.map((user) => user._id.toString());
}
