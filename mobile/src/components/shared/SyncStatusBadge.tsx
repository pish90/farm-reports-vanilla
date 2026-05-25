import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSyncStatus, useTriggerSync } from '../../store/SyncContext';

export default function SyncStatusBadge() {
  const status = useSyncStatus();
  const trigger = useTriggerSync();

  if (status === 'syncing') return <ActivityIndicator size="small" color="#2d6a4f" />;
  if (status === 'error') {
    return (
      <TouchableOpacity onPress={trigger} hitSlop={8}>
        <Feather name="wifi-off" size={18} color="#dc2626" />
      </TouchableOpacity>
    );
  }
  return null;
}
