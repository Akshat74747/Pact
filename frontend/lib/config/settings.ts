export const chatSettings = {} as const;

export const isSelectSetting = (
  _setting: unknown
): _setting is never => false;

export type ChatSettingsValues = Record<string, string | undefined>;
export type ChatSettingsKey = never;
export const chatSettingsKeys: ChatSettingsKey[] = [];
