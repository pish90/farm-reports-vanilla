import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from './src/db/database';
import RootNavigator from './src/navigation';
import { navigationRef } from './src/navigation/navigationRef';
import { initAutoSync } from './src/services/syncService';
import { AuthProvider } from './src/store/AuthContext';
import { SyncProvider } from './src/store/SyncContext';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    return initAutoSync();
  }, [dbReady]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SyncProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </SyncProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
