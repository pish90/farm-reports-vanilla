import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, View } from 'react-native';
import SyncStatusBadge from '../components/shared/SyncStatusBadge';
import AttendanceScreen from '../screens/AttendanceScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StockScreen from '../screens/StockScreen';
import SummaryScreen from '../screens/SummaryScreen';
import WorkersScreen from '../screens/WorkersScreen';
import { useAuth } from '../store/AuthContext';
import type { AttendanceStackParamList, ExpensesStackParamList, MainTabParamList, ReportsStackParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const AttendanceStack = createNativeStackNavigator<AttendanceStackParamList>();
const ExpensesStack   = createNativeStackNavigator<ExpensesStackParamList>();
const ReportsStack    = createNativeStackNavigator<ReportsStackParamList>();

function AttendanceNavigator() {
  return (
    <AttendanceStack.Navigator screenOptions={{ headerShown: false }}>
      <AttendanceStack.Screen name="AttendanceHome" component={AttendanceScreen} />
      <AttendanceStack.Screen
        name="Workers"
        component={WorkersScreen}
        options={{
          headerShown: true,
          title: 'Manage Workers',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerTintColor: '#2d6a4f',
        }}
      />
    </AttendanceStack.Navigator>
  );
}

function ExpensesNavigator() {
  return (
    <ExpensesStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesStack.Screen name="ExpensesHome" component={ExpensesScreen} />
    </ExpensesStack.Navigator>
  );
}

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsHome" component={ReportsScreen} />
      <ReportsStack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{
          headerShown: true,
          title: 'Report Summary',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerTintColor: '#2d6a4f',
        }}
      />
    </ReportsStack.Navigator>
  );
}

const ICONS: Partial<Record<keyof MainTabParamList, keyof typeof Feather.glyphMap>> = {
  Dashboard:  'home',
  Attendance: 'users',
  Stock:      'package',
  Expenses:   'dollar-sign',
  Reports:    'file-text',
  Settings:   'settings',
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
          <Feather
            name={ICONS[route.name as keyof MainTabParamList] ?? 'circle'}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerTitle: user?.name ?? 'Farm Reports' }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Stock"     component={StockScreen} />
      <Tab.Screen
        name="Expenses"
        component={ExpensesNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
