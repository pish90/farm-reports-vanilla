import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import SyncStatusBadge from '../components/shared/SyncStatusBadge';
import AttendanceLandingScreen from '../screens/AttendanceLandingScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import CasualAttendanceScreen from '../screens/CasualAttendanceScreen';
import CasualReportScreen from '../screens/CasualReportScreen';
import CreateWorkSessionScreen from '../screens/CreateWorkSessionScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SelectCasualsScreen from '../screens/SelectCasualsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StockScreen from '../screens/StockScreen';
import SummaryScreen from '../screens/SummaryScreen';
import WorkersScreen from '../screens/WorkersScreen';
import { useAuth } from '../store/AuthContext';
import type {
  AttendanceStackParamList,
  ExpensesStackParamList,
  MainTabParamList,
  ReportsStackParamList,
  SettingsStackParamList,
} from '../types';

const Tab          = createBottomTabNavigator<MainTabParamList>();
const AttendanceStack = createNativeStackNavigator<AttendanceStackParamList>();
const ExpensesStack   = createNativeStackNavigator<ExpensesStackParamList>();
const ReportsStack    = createNativeStackNavigator<ReportsStackParamList>();
const SettingsStack   = createNativeStackNavigator<SettingsStackParamList>();

const STACK_HEADER_OPTS = {
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerTintColor: '#2d6a4f',
};

function AttendanceNavigator() {
  return (
    <AttendanceStack.Navigator screenOptions={{ headerShown: false }}>
      <AttendanceStack.Screen name="AttendanceLanding" component={AttendanceLandingScreen} />
      <AttendanceStack.Screen name="AttendanceHome"    component={AttendanceScreen} />
      <AttendanceStack.Screen
        name="Workers"
        component={WorkersScreen}
        options={{ headerShown: true, title: 'Manage Workers', ...STACK_HEADER_OPTS }}
      />
      <AttendanceStack.Screen name="CasualHome" component={CasualAttendanceScreen} />
      <AttendanceStack.Screen
        name="CreateWorkSession"
        component={CreateWorkSessionScreen}
        options={{ headerShown: true, title: 'New Work Session', ...STACK_HEADER_OPTS }}
      />
      <AttendanceStack.Screen
        name="SelectCasuals"
        component={SelectCasualsScreen}
        options={{ headerShown: true, title: 'Select Casuals', ...STACK_HEADER_OPTS }}
      />
      <AttendanceStack.Screen
        name="CasualReport"
        component={CasualReportScreen}
        options={{ headerShown: true, title: 'Casuals Report', ...STACK_HEADER_OPTS }}
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
        options={{ headerShown: true, title: 'Report Summary', ...STACK_HEADER_OPTS }}
      />
    </ReportsStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: 'Settings', ...STACK_HEADER_OPTS }}
      />
      <SettingsStack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{ title: 'Audit Log', ...STACK_HEADER_OPTS }}
      />
    </SettingsStack.Navigator>
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
      <Tab.Screen name="Stock" component={StockScreen} />
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
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
