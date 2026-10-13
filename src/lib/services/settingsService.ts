import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { SystemSettings } from '../../types';

export const DEFAULT_SETTINGS: SystemSettings = {
  orgName: 'ISKCON Foundation',
  appTitle: 'ISKCON Retail ERP',
  brandingColor: '#D97706',
  currencySymbol: '₹',
  taxId: '27AAAAA1111A1Z1',
  address: 'Hare Krishna Land, Juhu, Mumbai, 400049',
  phone: '+91 22 2620 6860',
  email: 'contact@iskconmumbai.com',
  logoUrl: '',
};

export async function getSettings(): Promise<SystemSettings> {
  try {
    if (process.env.DATABASE_URL) {
      const dbSetting = await prisma.systemSetting.findFirst();
      if (dbSetting) {
        return {
          logoUrl: dbSetting.logoUrl || '',
          orgName: dbSetting.orgName,
          appTitle: dbSetting.appTitle,
          brandingColor: dbSetting.brandingColor,
          currencySymbol: dbSetting.currencySymbol,
          taxId: dbSetting.taxId || '',
          address: dbSetting.address || '',
          phone: dbSetting.phone || '',
          email: dbSetting.email || '',
        };
      }
    }
  } catch (error) {
    console.warn('Prisma getSettings failed, falling back to MemoryDb settings:', error);
  }
  return MemoryDb.settings || DEFAULT_SETTINGS;
}

export async function updateSettings(settingsData: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = await getSettings();
  const updated: SystemSettings = {
    ...current,
    ...settingsData,
  };

  try {
    if (process.env.DATABASE_URL) {
      await prisma.systemSetting.upsert({
        where: { id: 'settings' },
        update: {
          logoUrl: updated.logoUrl,
          orgName: updated.orgName,
          appTitle: updated.appTitle,
          brandingColor: updated.brandingColor,
          currencySymbol: updated.currencySymbol,
          taxId: updated.taxId,
          address: updated.address,
          phone: updated.phone,
          email: updated.email,
        },
        create: {
          id: 'settings',
          logoUrl: updated.logoUrl,
          orgName: updated.orgName,
          appTitle: updated.appTitle,
          brandingColor: updated.brandingColor,
          currencySymbol: updated.currencySymbol,
          taxId: updated.taxId,
          address: updated.address,
          phone: updated.phone,
          email: updated.email,
        },
      });
      return updated;
    }
  } catch (error) {
    console.warn('Prisma updateSettings failed, saving to MemoryDb:', error);
  }

  MemoryDb.settings = updated;
  return updated;
}
