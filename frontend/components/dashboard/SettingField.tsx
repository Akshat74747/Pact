"use client";

import { ChatSettingsKey } from "@/lib/config/settings";

interface SettingFieldProps {
  settingKey: ChatSettingsKey;
  value: string | undefined;
  onChange: (value: string) => void;
}

export default function SettingField(_props: SettingFieldProps) {
  return null;
}
