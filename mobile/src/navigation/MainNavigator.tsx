import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AttendanceScreen from '../screens/AttendanceScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StockScreen from '../screens/StockScreen';
import SyncStatusBadge from '../components/shared/SyncStatusBadge';
import { useAuth } from '../store/AuthContext';
import type { MainTabParamList } from '../types';
import { View } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
  Dashboard: 'home',
  Attendance: 'users',
  Stock: 'package',
  Expenses: 'dollar-sign',
  Reports: 'file-text',
  Settings: 'settings',
};

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerRight: () => (
          <View style={{ marginRight: 14 }}>
            <SyncStatusBadge />
          </View>
        ),
        tabBarActiveTintColor: '#2d6a4f',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopColor: '#eee' },
        tabBarIcon: ({ color, size }) => (
          <Feather name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerTitle: user?.name ?? 'Farm Reports' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
