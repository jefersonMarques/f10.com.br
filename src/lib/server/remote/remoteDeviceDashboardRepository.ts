import { desc, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { remoteDevices } from "$lib/server/db/operationsSettingsSchema";
import {
  customerContacts,
  customerOrganizations,
} from "$lib/server/db/supportSchema";

export async function listRemoteDeviceDashboard(limit = 300) {
  const db = getDatabase();
  return db
    .select({
      id: remoteDevices.id,
      name: remoteDevices.name,
      active: remoteDevices.active,
      online: remoteDevices.online,
      lastSeenAt: remoteDevices.lastSeenAt,
      lastOnlineAt: remoteDevices.lastOnlineAt,
      providerGroupId: remoteDevices.providerGroupId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
      updatedAt: remoteDevices.updatedAt,
    })
    .from(remoteDevices)
    .leftJoin(customerContacts, eq(remoteDevices.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(remoteDevices.customerOrganizationId, customerOrganizations.id),
    )
    .orderBy(desc(remoteDevices.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}
