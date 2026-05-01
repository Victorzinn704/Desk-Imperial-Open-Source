import { NotificationPreferencesController } from '../src/modules/notifications/notification-preferences.controller'
import type { NotificationPreferencesService } from '../src/modules/notifications/notification-preferences.service'

describe('NotificationPreferencesController', () => {
  const notificationPreferencesService = {
    listForWorkspace: jest.fn(),
    updateForWorkspace: jest.fn(),
    listForUser: jest.fn(),
    updateForUser: jest.fn(),
  }

  let controller: NotificationPreferencesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new NotificationPreferencesController(
      notificationPreferencesService as unknown as NotificationPreferencesService,
    )
  })

  it('delegates workspace preference reads', async () => {
    notificationPreferencesService.listForWorkspace.mockResolvedValueOnce({ preferences: [] })

    await expect(controller.getWorkspacePreferences({ userId: 'owner-1' } as never)).resolves.toEqual({
      preferences: [],
    })

    expect(notificationPreferencesService.listForWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1' }),
    )
  })

  it('delegates user preference updates', async () => {
    notificationPreferencesService.updateForUser.mockResolvedValueOnce({ preferences: [] })

    await expect(
      controller.updateUserPreferences(
        { userId: 'staff-1' } as never,
        {
          preferences: [
            {
              channel: 'WEB_TOAST',
              eventType: 'operations.comanda.status_changed',
              enabled: false,
            },
          ],
        },
        {
          ip: '127.0.0.1',
          headers: {},
          get: jest.fn(() => null),
        } as never,
      ),
    ).resolves.toEqual({ preferences: [] })

    expect(notificationPreferencesService.updateForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'staff-1' }),
      expect.objectContaining({
        preferences: [
          expect.objectContaining({
            channel: 'WEB_TOAST',
          }),
        ],
      }),
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    )
  })
})
